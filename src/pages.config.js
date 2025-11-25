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
}

export const pagesConfig = {
    mainPage: "Registration",
    Pages: PAGES,
    Layout: __Layout,
};