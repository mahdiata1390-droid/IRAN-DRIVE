export type SharinganState =
  | 'idle'
  | 'loading'
  | 'sent'
  | 'received'
  | 'notification'
  | 'recording'
  | 'active';

export type EyeType = 'sharingan' | 'rinnegan';

export interface UchihaEyeProps {
  type?: EyeType;
  state?: SharinganState;
  size?: number;
  animated?: boolean;
  intensity?: number;
  style?: import('react-native').ViewStyle;
}
