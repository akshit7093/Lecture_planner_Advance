declare module 'react-katex' {
  import React from 'react';
  
  interface KaTeXProps {
    children?: string | number;
    math?: string | number;
    block?: boolean;
    errorColor?: string;
    renderError?: (error: Error | string) => React.ReactNode;
    settings?: {
      displayMode?: boolean;
      throwOnError?: boolean;
      errorColor?: string;
      macros?: Record<string, string>;
      colorIsTextColor?: boolean;
      maxSize?: number;
      maxExpand?: number;
      strict?: boolean | string | Function;
      trust?: boolean | Function;
    };
  }
  
  export const InlineMath: React.FC<KaTeXProps>;
  export const BlockMath: React.FC<KaTeXProps>;
  
  // For default exports
  declare const KaTeX: {
    InlineMath: React.FC<KaTeXProps>;
    BlockMath: React.FC<KaTeXProps>;
  };
  
  export default KaTeX;
}