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
}

export const pagesConfig = {
    mainPage: "Registration",
    Pages: PAGES,
    Layout: __Layout,
};