import { Home, CheckSquare, PenTool, Library, Calendar, BarChart3, FileText, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ScreenKey =
  | 'home' | 'today' | 'studio' | 'library' | 'calendar'
  | 'analytics' | 'report' | 'settings';

export interface NavItem {
  key: ScreenKey;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'today', label: 'Today', icon: CheckSquare },
  { key: 'studio', label: 'Studio', icon: PenTool },
  { key: 'library', label: 'Library', icon: Library },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'report', label: 'Report', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings },
];
