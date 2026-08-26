// assets
import {
  DashboardOutlined,
  BookOutlined,
  AppstoreOutlined,
  ReadOutlined,
  ClusterOutlined,
  CloudUploadOutlined,
  TeamOutlined,
  CreditCardOutlined,
  BarChartOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined
} from '@ant-design/icons';

// icons
const icons = {
  DashboardOutlined,
  BookOutlined,
  AppstoreOutlined,
  ReadOutlined,
  ClusterOutlined,
  CloudUploadOutlined,
  TeamOutlined,
  CreditCardOutlined,
  BarChartOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined
};

// ==============================|| MENU ITEMS - MAIN ||============================== //

const dashboard = {
  id: 'group-main',
  title: 'Main',
  type: 'group',
  children: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      type: 'item',
      url: '/dashboard',
      icon: icons.DashboardOutlined,
      breadcrumbs: false
    },
    {
      id: 'content',
      title: 'Content',
      type: 'collapse',
      icon: icons.BookOutlined,
      children: [
        {
          id: 'categories',
          title: 'Categories',
          type: 'item',
          url: '/content/categories',
          icon: icons.AppstoreOutlined
        },
        {
          id: 'courses',
          title: 'Courses',
          type: 'item',
          url: '/content/courses',
          icon: icons.ReadOutlined
        },
        {
          id: 'modules-lessons',
          title: 'Modules & Lessons',
          type: 'item',
          url: '/content/modules-lessons',
          icon: icons.ClusterOutlined
        },
        {
          id: 'media-library',
          title: 'Media Library',
          type: 'item',
          url: '/content/media',
          icon: icons.CloudUploadOutlined
        }
      ]
    },
    {
      id: 'users',
      title: 'Users',
      type: 'item',
      url: '/users',
      icon: icons.TeamOutlined
    },
    {
      id: 'subscriptions',
      title: 'Subscriptions',
      type: 'item',
      url: '/subscriptions',
      icon: icons.CreditCardOutlined
    },
    {
      id: 'analytics',
      title: 'Analytics',
      type: 'item',
      url: '/analytics',
      icon: icons.BarChartOutlined
    }
  ]
};

export default dashboard;

export const account = {
  id: 'group-account',
  title: 'Account',
  type: 'group',
  children: [
    {
      id: 'notifications',
      title: 'Notifications',
      type: 'item',
      url: '/notifications',
      icon: icons.BellOutlined
    },
    // Settings temporarily hidden
    // {
    //   id: 'settings',
    //   title: 'Settings',
    //   type: 'item',
    //   url: '/settings',
    //   icon: icons.SettingOutlined
    // },
    {
      id: 'logout',
      title: 'Logout',
      type: 'item',
      url: '/login',
      icon: icons.LogoutOutlined,
      breadcrumbs: false
    }
  ]
};
