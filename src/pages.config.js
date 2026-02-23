/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import APIModule from './pages/APIModule';
import AccessControl from './pages/AccessControl';
import AddEmployee from './pages/AddEmployee';
import AssetDashboard from './pages/AssetDashboard';
import AssetList from './pages/AssetList';
import AssetMaintenance from './pages/AssetMaintenance';
import AssetReports from './pages/AssetReports';
import AssetRequests from './pages/AssetRequests';
import AttendanceManagement from './pages/AttendanceManagement';
import AuthRedirect from './pages/AuthRedirect';
import BackgroundVerification from './pages/BackgroundVerification';
import CompanyFeed from './pages/CompanyFeed';
import CompanyPolicies from './pages/CompanyPolicies';
import DeptHeadDashboard from './pages/DeptHeadDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeOnboarding from './pages/EmployeeOnboarding';
import EmployeeUpload from './pages/EmployeeUpload';
import Employees from './pages/Employees';
import ExpenseApproval from './pages/ExpenseApproval';
import FreelancerDashboard from './pages/FreelancerDashboard';
import FreelancerProjects from './pages/FreelancerProjects';
import FreelancerUpload from './pages/FreelancerUpload';
import Freelancers from './pages/Freelancers';
import HRDashboard from './pages/HRDashboard';
import Home from './pages/Home';
import ModuleManagement from './pages/ModuleManagement';
import MyAssets from './pages/MyAssets';
import MyAttendance from './pages/MyAttendance';
import MyExpenses from './pages/MyExpenses';
import MyPayslips from './pages/MyPayslips';
import NotificationCenter from './pages/NotificationCenter';
import Notifications from './pages/Notifications';
import OfferLetterManagement from './pages/OfferLetterManagement';
import OfficeOpsArena from './pages/OfficeOpsArena';
import OnboardingTemplates from './pages/OnboardingTemplates';
import PayslipManagement from './pages/PayslipManagement';
import PolicyManagement from './pages/PolicyManagement';
import ProjectDetails from './pages/ProjectDetails';
import ProjectManagement from './pages/ProjectManagement';
import PushNotificationTest from './pages/PushNotificationTest';
import Registration from './pages/Registration';
import Settings from './pages/Settings';
import TeamView from './pages/TeamView';
import TestEmail from './pages/TestEmail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "APIModule": APIModule,
    "AccessControl": AccessControl,
    "AddEmployee": AddEmployee,
    "AssetDashboard": AssetDashboard,
    "AssetList": AssetList,
    "AssetMaintenance": AssetMaintenance,
    "AssetReports": AssetReports,
    "AssetRequests": AssetRequests,
    "AttendanceManagement": AttendanceManagement,
    "AuthRedirect": AuthRedirect,
    "BackgroundVerification": BackgroundVerification,
    "CompanyFeed": CompanyFeed,
    "CompanyPolicies": CompanyPolicies,
    "DeptHeadDashboard": DeptHeadDashboard,
    "EmployeeDashboard": EmployeeDashboard,
    "EmployeeOnboarding": EmployeeOnboarding,
    "EmployeeUpload": EmployeeUpload,
    "Employees": Employees,
    "ExpenseApproval": ExpenseApproval,
    "FreelancerDashboard": FreelancerDashboard,
    "FreelancerProjects": FreelancerProjects,
    "FreelancerUpload": FreelancerUpload,
    "Freelancers": Freelancers,
    "HRDashboard": HRDashboard,
    "Home": Home,
    "ModuleManagement": ModuleManagement,
    "MyAssets": MyAssets,
    "MyAttendance": MyAttendance,
    "MyExpenses": MyExpenses,
    "MyPayslips": MyPayslips,
    "NotificationCenter": NotificationCenter,
    "Notifications": Notifications,
    "OfferLetterManagement": OfferLetterManagement,
    "OfficeOpsArena": OfficeOpsArena,
    "OnboardingTemplates": OnboardingTemplates,
    "PayslipManagement": PayslipManagement,
    "PolicyManagement": PolicyManagement,
    "ProjectDetails": ProjectDetails,
    "ProjectManagement": ProjectManagement,
    "PushNotificationTest": PushNotificationTest,
    "Registration": Registration,
    "Settings": Settings,
    "TeamView": TeamView,
    "TestEmail": TestEmail,
}

export const pagesConfig = {
    mainPage: "EmployeeDashboard",
    Pages: PAGES,
    Layout: __Layout,
};