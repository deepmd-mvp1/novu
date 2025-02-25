import { ChannelTypeEnum, ICredentials } from '@novu/shared';

import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import { ChangePropsValueType } from '../../types/helpers';

export class IntegrationEntity {
  _id: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  providerId: string;

  channel: ChannelTypeEnum;

  credentials: ICredentialsEntity;

  active: boolean;

  name: string;

  identifier: string;

  deleted: boolean;

  deletedAt: string;

  deletedBy: string;
}

export type ICredentialsEntity = ICredentials;

export type IntegrationDBModel = ChangePropsValueType<IntegrationEntity, '_environmentId' | '_organizationId'>;
