import { SetMetadata } from '@nestjs/common';

import { Action } from '../../enums/action.enum';
import { Subject } from '../../enums/subject.enum';

export const CHECK_POLICIES_KEY = 'check_policies';

export interface RequiredPolicy {
  action: Action;
  subject: Subject;
}

export const CheckPolicies = (
  ...policies: RequiredPolicy[]
) => SetMetadata(CHECK_POLICIES_KEY, policies);
