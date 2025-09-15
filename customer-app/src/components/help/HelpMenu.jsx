import { HelpCircle, Search, FileText, Book, MessageCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const HelpMenu = () => {
  const navigate = useNavigate();

  const helpItems = [
    {
      icon: Book,
      label: 'Documentation',
      description: 'Browse searchable help docs',
      action: () => navigate('/help/docs'),
    },
    {
      icon: FileText,
      label: 'API Reference',
      description: 'Complete API documentation',
      action: () => navigate('/help/api'),
    },
    {
      icon: Search,
      label: 'Search Help',
      description: 'Find answers quickly',
      action: () => navigate('/help/search'),
    },
  ];

  const supportItems = [
    {
      icon: MessageCircle,
      label: 'Chat Support',
      description: 'Coming soon',
      action: () => {},
      disabled: true,
    },
    {
      icon: AlertCircle,
      label: 'Submit Ticket',
      description: 'Coming soon',
      action: () => {},
      disabled: true,
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Help and support"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" role="menu" aria-label="Help menu">
        <div className="p-2">
          <div className="mb-2">
            <h4 className="font-semibold text-sm mb-1">Help & Documentation</h4>
            <p className="text-xs text-muted-foreground">Find answers and resources</p>
          </div>

          {helpItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={index}
                onClick={item.action}
                className="p-3 cursor-pointer focus:bg-accent"
                role="menuitem"
                disabled={item.disabled}
              >
                <div className="flex items-start space-x-3 w-full">
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator className="my-2" />

          <div className="mb-2">
            <h4 className="font-semibold text-sm mb-1">Support</h4>
          </div>

          {supportItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={index}
                onClick={item.action}
                className="p-3 cursor-pointer focus:bg-accent opacity-60"
                role="menuitem"
                disabled={item.disabled}
              >
                <div className="flex items-start space-x-3 w-full">
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HelpMenu;