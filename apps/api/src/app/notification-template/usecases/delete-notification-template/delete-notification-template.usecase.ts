// eslint-ignore max-len

import { Injectable } from '@nestjs/common';
import { ChangeRepository, DalException, NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { CreateChange, CreateChangeCommand } from '../../../change/usecases';
import { ApiException } from '../../../shared/exceptions/api.exception';

import {
  buildNotificationTemplateIdentifierKey,
  buildNotificationTemplateKey,
  InvalidateCacheService,
} from '@novu/application-generic';
import { DeleteMessageTemplateCommand } from '../../../message-template/usecases/delete-message-template/delete-message-template.command';
import { DeleteMessageTemplate } from '../../../message-template/usecases/delete-message-template/delete-message-template.usecase';
import { GetNotificationTemplateCommand } from '../get-notification-template/get-notification-template.command';

/**
 * DEPRECATED:
 * This usecase is deprecated and will be removed in the future.
 * Please use the DeleteWorkflow usecase instead.
 */
@Injectable()
export class DeleteNotificationTemplate {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createChange: CreateChange,
    private changeRepository: ChangeRepository,
    private invalidateCache: InvalidateCacheService,
    private deleteMessageTemplate: DeleteMessageTemplate
  ) {}

  async execute(command: GetNotificationTemplateCommand) {
    try {
      const notificationTemplate = await this.notificationTemplateRepository.findOne({
        _environmentId: command.environmentId,
        _id: command.templateId,
      });
      if (!notificationTemplate) {
        throw new DalException(`Could not find workflow with id ${command.templateId}`);
      }

      const parentChangeId: string = await this.changeRepository.getChangeId(
        command.environmentId,
        ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
        command.templateId
      );

      for (const step of notificationTemplate.steps) {
        await this.deleteMessageTemplate.execute(
          DeleteMessageTemplateCommand.create({
            organizationId: command.organizationId,
            environmentId: command.environmentId,
            userId: command.userId,
            messageTemplateId: step._templateId,
            parentChangeId: parentChangeId,
          })
        );
      }

      await this.notificationTemplateRepository.delete({
        _environmentId: command.environmentId,
        _id: command.templateId,
      });

      const item: NotificationTemplateEntity = (
        await this.notificationTemplateRepository.findDeleted({
          _environmentId: command.environmentId,
          _id: command.templateId,
        })
      )?.[0];

      await this.invalidateCache.invalidateByKey({
        key: buildNotificationTemplateKey({
          _id: item._id,
          _environmentId: command.environmentId,
        }),
      });

      await this.invalidateCache.invalidateByKey({
        key: buildNotificationTemplateIdentifierKey({
          templateIdentifier: item.triggers[0].identifier,
          _environmentId: command.environmentId,
        }),
      });

      await this.createChange.execute(
        CreateChangeCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          item: item,
          type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
          changeId: parentChangeId,
        })
      );
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return true;
  }
}
