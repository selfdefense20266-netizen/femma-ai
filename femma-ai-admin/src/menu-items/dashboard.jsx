// assets
import {
  DashboardOutlined,
  BookOutlined,
  RocketOutlined,
  ScheduleOutlined,
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
  RocketOutlined,
  ScheduleOutlined,
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
          id: 'guided-journeys',
          title: 'Guided Journeys',
          type: 'item',
          url: '/content/guided-journeys',
          icon: icons.RocketOutlined
        },
        {
          id: 'daily-plans',
          title: 'Daily Plans',
          type: 'item',
          url: '/content/daily-plans',
          icon: icons.ScheduleOutlined
        },
        {
          id: 'recovery',
          title: 'Recovery',
          type: 'item',
          url: '/content/recovery',
          icon: icons.CloudUploadOutlined
        },
        {
          id: 'program',
          title: 'Program',
          type: 'item',
          url: '/content/program',
          icon: icons.ReadOutlined
        },
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
      id: 'settings',
      title: 'Settings',
      type: 'item',
      url: '/settings',
      icon: icons.SettingOutlined
    },
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
