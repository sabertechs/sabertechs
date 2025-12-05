import Registration from './pages/Registration';
import EmployeeDashboard from './pages/EmployeeDashboard';
import HRDashboard from './pages/HRDashboard';
import Employees from './pages/Employees';
import MyAttendance from './pages/MyAttendance';
import MyPayslips from './pages/MyPayslips';
import MyExpenses from './pages/MyExpenses';
import ExpenseApproval from './pages/ExpenseApproval';
import OfferLetterManagement from './pages/OfferLetterManagement';
import BackgroundVerification from './pages/BackgroundVerification';
import AttendanceManagement from './pages/AttendanceManagement';
import PayslipManagement from './pages/PayslipManagement';
import Notifications from './pages/Notifications';
import DeptHeadDashboard from './pages/DeptHeadDashboard';
import TeamView from './pages/TeamView';
import OnboardingManagement from './pages/OnboardingManagement';
import EmployeeUpload from './pages/EmployeeUpload';
import AccessControl from './pages/AccessControl';
import AuthRedirect from './pages/AuthRedirect';
import Settings from './pages/Settings';
import NotificationCenter from './pages/NotificationCenter';
import CompanyFeed from './pages/CompanyFeed';
import TestEmail from './pages/TestEmail';
import PolicyManagement from './pages/PolicyManagement';
import CompanyPolicies from './pages/CompanyPolicies';
import AssetDashboard from './pages/AssetDashboard';
import AssetList from './pages/AssetList';
import AssetRequests from './pages/AssetRequests';
import AssetMaintenance from './pages/AssetMaintenance';
import MyAssets from './pages/MyAssets';
import AssetReports from './pages/AssetReports';
import OfficeOpsArena from './pages/OfficeOpsArena';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Registration": Registration,
    "EmployeeDashboard": EmployeeDashboard,
    "HRDashboard": HRDashboard,
    "Employees": Employees,
    "MyAttendance": MyAttendance,
    "MyPayslips": MyPayslips,
    "MyExpenses": MyExpenses,
    "ExpenseApproval": ExpenseApproval,
    "OfferLetterManagement": OfferLetterManagement,
    "BackgroundVerification": BackgroundVerification,
    "AttendanceManagement": AttendanceManagement,
    "PayslipManagement": PayslipManagement,
    "Notifications": Notifications,
    "DeptHeadDashboard": DeptHeadDashboard,
    "TeamView": TeamView,
    "OnboardingManagement": OnboardingManagement,
    "EmployeeUpload": EmployeeUpload,
    "AccessControl": AccessControl,
    "AuthRedirect": AuthRedirect,
    "Settings": Settings,
    "NotificationCenter": NotificationCenter,
    "CompanyFeed": CompanyFeed,
    "TestEmail": TestEmail,
    "PolicyManagement": PolicyManagement,
    "CompanyPolicies": CompanyPolicies,
    "AssetDashboard": AssetDashboard,
    "AssetList": AssetList,
    "AssetRequests": AssetRequests,
    "AssetMaintenance": AssetMaintenance,
    "MyAssets": MyAssets,
    "AssetReports": AssetReports,
    "OfficeOpsArena": OfficeOpsArena,
}

export const pagesConfig = {
    mainPage: "MyAttendance",
    Pages: PAGES,
    Layout: __Layout,
};