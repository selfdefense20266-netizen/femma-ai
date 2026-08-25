import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useLocation, matchPath } from 'react-router-dom';

// material-ui
import Collapse from '@mui/material/Collapse';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

// project imports
import NavItem from './NavItem';
import { useGetMenuMaster } from 'api/menu';

// assets
import { DownOutlined, UpOutlined } from '@ant-design/icons';

// ==============================|| NAVIGATION - COLLAPSE ||============================== //

export default function NavCollapse({ menu, level }) {
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;
  const { pathname } = useLocation();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);

  const handleClick = () => {
    setOpen(!open);
  };

  const checkOpenForParent = (children) => {
    children.forEach((child) => {
      if (child.children?.length) {
        checkOpenForParent(child.children);
      }
      if (child.url && !!matchPath({ path: child.url, end: false }, pathname)) {
        setSelected(true);
        setOpen(true);
      }
    });
  };

  useEffect(() => {
    setSelected(false);
    if (menu.children) {
      menu.children.forEach((item) => {
        if (item.url && !!matchPath({ path: item.url, end: false }, pathname)) {
          setSelected(true);
          setOpen(true);
        }
        if (item.children?.length) {
          checkOpenForParent(item.children);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, menu.children]);

  const menus = menu.children?.map((item) => {
    switch (item.type) {
      case 'collapse':
        return <NavCollapse key={item.id} menu={item} level={level + 1} />;
      case 'item':
        return <NavItem key={item.id} item={item} level={level + 1} />;
      default:
        return (
          <Typography key={item.id} variant="h6" color="error" align="center">
            Fix - Collapse or Items
          </Typography>
        );
    }
  });

  const Icon = menu.icon;
  const menuIcon = menu.icon ? <Icon style={{ fontSize: drawerOpen ? '1rem' : '1.25rem' }} /> : false;

  const textColor = 'text.primary';
  const iconSelectedColor = 'primary.main';

  return (
    <>
      <ListItemButton
        selected={selected}
        onClick={handleClick}
        sx={(theme) => ({
          zIndex: 1201,
          pl: drawerOpen ? `${level * 28}px` : 1.5,
          py: !drawerOpen && level === 1 ? 1.25 : 1,
          ...(drawerOpen && {
            '&:hover': { bgcolor: 'primary.lighter' },
            '&.Mui-selected': {
              bgcolor: 'transparent',
              color: iconSelectedColor,
              '&:hover': { color: iconSelectedColor, bgcolor: 'primary.lighter' }
            }
          }),
          ...(!drawerOpen && {
            '&:hover': { bgcolor: 'transparent' },
            '&.Mui-selected': { bgcolor: 'transparent', '&:hover': { bgcolor: 'transparent' } }
          })
        })}
      >
        {menuIcon && (
          <ListItemIcon
            sx={{
              minWidth: 28,
              color: selected ? iconSelectedColor : textColor,
              ...(!drawerOpen && {
                borderRadius: 1.5,
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover': { bgcolor: 'secondary.lighter' }
              }),
              ...(!drawerOpen &&
                selected && {
                  bgcolor: 'primary.lighter',
                  '&:hover': { bgcolor: 'primary.lighter' }
                })
            }}
          >
            {menuIcon}
          </ListItemIcon>
        )}
        {(drawerOpen || (!drawerOpen && level !== 1)) && (
          <ListItemText
            primary={
              <Typography variant="h6" sx={{ color: selected ? iconSelectedColor : textColor }}>
                {menu.title}
              </Typography>
            }
          />
        )}
        {drawerOpen &&
          (open ? (
            <UpOutlined style={{ fontSize: '0.625rem', marginLeft: 1, color: 'inherit' }} />
          ) : (
            <DownOutlined style={{ fontSize: '0.625rem', marginLeft: 1, color: 'inherit' }} />
          ))}
      </ListItemButton>
      {drawerOpen && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List sx={{ p: 0 }}>{menus}</List>
        </Collapse>
      )}
    </>
  );
}

NavCollapse.propTypes = { menu: PropTypes.object, level: PropTypes.number };
