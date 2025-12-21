import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { 
  User, Mail, Phone, MapPin, Calendar, Video, PlayCircle,
  FileText, Download, Clock, Award, BookOpen, Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EditProfileSection from "@/components/employee/EditProfileSection";
import VideoPlayer from "@/components/lms/VideoPlayer";
import TestInterface from "@/components/lms/TestInterface";

export default function FreelancerDashboard() {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      const employees = await base44.entities.Employee.filter({ email: userData.email });
      if (employees.length > 0) setEmployee(employees[0]);
    };
    fetchData();
  }, []);

  const { data: expenses = [] } = useQuery({
    queryKey: ['myExpenses', user?.email],
    queryFn: () => base44.entities.Expense.filter({ employee_email: user?.email }, '-created_date', 10),
    enabled: !!user?.email,
  });

  const { data: lmsSettings = [] } = useQuery({
    queryKey: ['lmsSettings'],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: 'lms_config' }),
  });

  const { data: testResults = [] } = useQuery({
    queryKey: ['testResults', user?.email],
    queryFn: () => base44.entities.TestResult.filter({ employee_email: user?.email }, '-created_date', 5),
    enabled: !!user?.email,
  });

  const lmsConfig = Array.isArray(lmsSettings[0]?.setting_value) 
    ? lmsSettings[0].setting_value[0] 
    : lmsSettings[0]?.setting_value || {};
  const pendingExpenses = expenses.filter(e => e.status === 'pending').length;

  const handleVideoComplete = () => {
    setVideoCompleted(true);
  };

  const handleTestComplete = (result) => {
    setTestResult(result);
    setShowTest(false);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 md:p-8 text-white">
        <div className="flex items-center gap-4">
          {employee?.profile_photo ? (
            <img src={employee.profile_photo} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-white/30" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
              {user?.full_name?.[0] || 'F'}
            </div>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome, {user?.full_name?.split(' ')[0] || 'Freelancer'}!
            </h1>
            <p className="text-purple-100 mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <Badge className="mt-2 bg-white/20 text-white border-white/30">
              Contractual Employee
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Briefcase className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {employee?.date_of_joining ? 
                    Math.floor((new Date() - new Date(employee.date_of_joining)) / (1000 * 60 * 60 * 24)) 
                    : 0}
                </p>
                <p className="text-sm text-slate-500">Days with us</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{pendingExpenses}</p>
                <p className="text-sm text-slate-500">Pending Expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {employee?.status === 'active' ? 'Active' : 'Pending'}
                </p>
                <p className="text-sm text-slate-500">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Resources */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Video className="w-5 h-5 text-purple-600" />
            Learning Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lmsConfig.video_url ? (
            <>
              {!showTest ? (
                <>
                  <VideoPlayer 
                    videoUrl={lmsConfig.video_url} 
                    onComplete={handleVideoComplete}
                  />
                  {videoCompleted && lmsConfig.questions?.length > 0 && (
                    <div className="text-center">
                      <Button 
                        onClick={() => setShowTest(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Take Test
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <TestInterface 
                  test={lmsConfig}
                  onComplete={handleTestComplete}
                />
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-16 h-16 mx-auto text-purple-300 mb-4" />
              <p className="text-slate-500 mb-4">
                Training videos and resources will appear here when shared by your manager
              </p>
              <Badge className="bg-purple-100 text-purple-700">
                Coming Soon
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Expense Submissions</CardTitle>
          <Link to={createPageUrl("MyExpenses")}>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p>No expenses submitted yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-100">
                    <th className="pb-3 text-sm font-medium text-slate-500">Type</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Amount</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Date</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 5).map((expense) => (
                    <tr key={expense.id} className="border-b border-slate-50">
                      <td className="py-4 capitalize">{expense.expense_type?.replace('_', ' ')}</td>
                      <td className="py-4 font-semibold">₹{expense.amount?.toLocaleString()}</td>
                      <td className="py-4 text-slate-500">{format(new Date(expense.date), 'MMM d, yyyy')}</td>
                      <td className="py-4">
                        <Badge className={
                          expense.status === 'approved' ? 'bg-green-100 text-green-700' :
                          expense.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {expense.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test History */}
      {testResults.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              My Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-100">
                    <th className="pb-3 text-sm font-medium text-slate-500">Test</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Score</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Percentage</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Time</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Result</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result) => (
                    <tr key={result.id} className="border-b border-slate-50">
                      <td className="py-4">{result.test_title}</td>
                      <td className="py-4 font-semibold">{result.score}/{result.total_marks}</td>
                      <td className="py-4">{result.percentage}%</td>
                      <td className="py-4">{Math.floor(result.time_taken_seconds / 60)}:{(result.time_taken_seconds % 60).toString().padStart(2, '0')}</td>
                      <td className="py-4">
                        <Badge className={result.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {result.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </td>
                      <td className="py-4 text-slate-500">{format(new Date(result.created_date), 'MMM d, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Profile */}
      <EditProfileSection employee={employee} onUpdate={setEmployee} />
    </div>
  );
}