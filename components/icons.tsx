import * as React from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  Plus,
  ArrowRight,
  Mail,
  ShieldCheck,
  PieChart,
  X,
  Loader2,
  Send,
} from "lucide-react";

export const Icons = {
  menu: Menu,
  logout: LogOut,
  plus: Plus,
  arrowRight: ArrowRight,
  mail: Mail,
  shield: ShieldCheck,
  revenue: PieChart,
  invoices: FileText,
  dashboard: LayoutDashboard,
  fileText: FileText,
  users: Users,
  payments: CreditCard,
  settings: Settings,
  x: X,
  loader: Loader2,
  send: Send,
};

export type IconName = keyof typeof Icons;

export function Icon({ name, ...props }: { name: IconName } & React.ComponentProps<"svg">) {
  const Component = Icons[name];
  if (!Component) {
    return null;
  }
  return <Component {...props} />;
}
