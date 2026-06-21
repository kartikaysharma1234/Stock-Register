import { Navbar } from "../Navbar";

interface AppBarProps {
  onOpenSidebar: () => void;
}

export const AppBar = ({ onOpenSidebar }: AppBarProps) => (
  <Navbar onOpenSidebar={onOpenSidebar} />
);
