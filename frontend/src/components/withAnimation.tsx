import UseAnimations from 'react-useanimations';

export function withAnimation(animation: any, _FallbackIcon: any) {
  return function AnimatedIcon({ className = '', size = 24, color, ref, ...props }: any) {
    let strokeColor = color || 'currentColor';
    return (
      <div ref={ref} className={`inline-flex items-center justify-center ${className.replace('animate-spin', '')}`} {...props}>
        <UseAnimations animation={animation} size={size} strokeColor={strokeColor} fillColor={strokeColor} />
      </div>
    );
  };
}
