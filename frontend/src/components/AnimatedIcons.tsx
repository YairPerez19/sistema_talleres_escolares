import React from 'react';
import UseAnimations from 'react-useanimations';
import loading from 'react-useanimations/lib/loading';
import mail from 'react-useanimations/lib/mail';
import lock from 'react-useanimations/lib/lock';
import checkmark from 'react-useanimations/lib/checkmark';
import plusToX from 'react-useanimations/lib/plusToX';
import searchToX from 'react-useanimations/lib/searchToX';
import explore from 'react-useanimations/lib/explore';
import arrowRightCircle from 'react-useanimations/lib/arrowRightCircle';
import alertCircle from 'react-useanimations/lib/alertCircle';
import notification from 'react-useanimations/lib/notification';
import userPlus from 'react-useanimations/lib/userPlus';
import checkBox from 'react-useanimations/lib/checkBox';
import download from 'react-useanimations/lib/download';
import calendar from 'react-useanimations/lib/calendar';

import * as LucideIcons from 'lucide-react';

// Re-export all lucide icons
export * from 'lucide-react';

const withAnimation = (animation: any, FallbackIcon: any) => {
  return React.forwardRef(({ className = '', size = 24, color, ...props }: any, ref: any) => {
    let strokeColor = color || 'currentColor';
    return (
      <div ref={ref} className={`inline-flex items-center justify-center ${className.replace('animate-spin', '')}`} {...props}>
        <UseAnimations animation={animation} size={size} strokeColor={strokeColor} fillColor={strokeColor} />
      </div>
    );
  });
};

// Override the ones we have animations for
export const Loader2 = withAnimation(loading, LucideIcons.Loader2);
export const Mail = withAnimation(mail, LucideIcons.Mail);
export const Lock = withAnimation(lock, LucideIcons.Lock);
export const UserCheck = withAnimation(checkmark, LucideIcons.UserCheck);
export const Plus = withAnimation(plusToX, LucideIcons.Plus);
export const Search = withAnimation(searchToX, LucideIcons.Search);
export const LayoutDashboard = withAnimation(explore, LucideIcons.LayoutDashboard);
export const LogOut = withAnimation(arrowRightCircle, LucideIcons.LogOut);
export const ShieldCheck = withAnimation(alertCircle, LucideIcons.ShieldCheck);
export const MessageSquare = withAnimation(notification, LucideIcons.MessageSquare);
export const LogIn = withAnimation(userPlus, LucideIcons.LogIn);
export const CheckSquare = withAnimation(checkBox, LucideIcons.CheckSquare);
export const Save = withAnimation(download, LucideIcons.Save);
export const RefreshCw = withAnimation(loading, LucideIcons.RefreshCw);
export const Clock = withAnimation(calendar, LucideIcons.Clock);
