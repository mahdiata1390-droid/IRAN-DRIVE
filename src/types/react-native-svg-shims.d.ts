declare module 'react-native-svg' {
  import { ViewProps } from 'react-native';
  import type { ComponentType, ReactElement, ReactNode, AnimatedComponent } from 'react-native-reanimated';
  import type { SharedValue } from 'react-native-reanimated';

  export interface SvgProps extends ViewProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    preserveAspectRatio?: string;
  }
  export interface PathProps extends ViewProps {
    d?: string;
    fill?: string | number | undefined;
    stroke?: string | number | undefined;
    strokeWidth?: number | string;
    strokeLinecap?: 'butt' | 'round' | 'square';
    strokeLinejoin?: 'miter' | 'round' | 'bevel';
    fillRule?: 'nonzero' | 'evenodd';
    opacity?: number;
  }
  export interface CircleProps extends ViewProps {
    cx?: number;
    cy?: number;
    r?: number;
    fill?: string | number | undefined;
    stroke?: string | number | undefined;
    strokeWidth?: number | string;
    opacity?: number;
    animatedProps?: Record<string, unknown>;
  }
  export interface EllipseProps extends ViewProps {
    cx?: number;
    cy?: number;
    rx?: number;
    ry?: number;
    fill?: string | number | undefined;
    stroke?: string | number | undefined;
    strokeWidth?: number | string;
    opacity?: number;
    animatedProps?: Record<string, unknown>;
  }
  export interface RectProps extends ViewProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rx?: number;
    ry?: number;
    fill?: string | number | undefined;
    stroke?: string | number | undefined;
    strokeWidth?: number | string;
    opacity?: number;
    animatedProps?: Record<string, unknown>;
  }
  export interface StopProps {
    offset: string | number;
    stopColor?: string;
    stopOpacity?: number;
  }
  export interface LinearGradientProps {
    id: string;
    x1?: string;
    y1?: string;
    x2?: string;
    y2?: string;
    gradientUnits?: string;
    children?: ReactNode;
  }
  export interface RadialGradientProps {
    id: string;
    cx?: string;
    cy?: string;
    r?: string;
    fx?: string;
    fy?: string;
    gradientUnits?: string;
    children?: ReactNode;
  }
  export interface DefsProps {
    children?: ReactNode;
  }
  export interface GProps {
    transform?: string;
    opacity?: number;
    children?: ReactNode;
    style?: Record<string, unknown>;
  }
  export interface TextProps extends ViewProps {
    x?: number;
    y?: number;
    fontSize?: number;
    fill?: string | number | undefined;
    opacity?: number;
    children?: ReactNode;
    animatedProps?: Record<string, unknown>;
  }
  export interface UseProps {
    href: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    opacity?: number;
  }
  export interface ClipPathProps {
    id: string;
    children?: ReactNode;
  }

  export const Path: ComponentType<PathProps>;
  export const Circle: ComponentType<CircleProps>;
  export const Ellipse: ComponentType<EllipseProps>;
  export const Rect: ComponentType<RectProps>;
  export const Stop: ComponentType<StopProps>;
  export const Defs: ComponentType<DefsProps>;
  export const G: ComponentType<GProps>;
  export const Text: ComponentType<TextProps>;
  export const Use: ComponentType<UseProps>;
  export const ClipPath: ComponentType<ClipPathProps>;
  export const LinearGradient: ComponentType<LinearGradientProps>;
  export const RadialGradient: ComponentType<RadialGradientProps>;

  export const Svg: ComponentType<SvgProps>;
  export default Svg;
}
