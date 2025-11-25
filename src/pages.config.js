import Registration from './pages/Registration';
import EmployeeDashboard from './pages/EmployeeDashboard';
import HRDashboard from './pages/HRDashboard';
import Employees from './pages/Employees';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Registration": Registration,
    "EmployeeDashboard": EmployeeDashboard,
    "HRDashboard": HRDashboard,
    "Employees": Employees,
}

export const pagesConfig = {
    mainPage: "Registration",
    Pages: PAGES,
    Layout: __Layout,
};