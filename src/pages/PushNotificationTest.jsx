import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bell, Send, Smartphone, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function PushNotificationTest() {
  const [deviceToken, setDeviceToken] = useState("");
  const [deviceType, setDeviceType] = useState("android");
  const [deviceName, setDeviceName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  const [testEmail, setTestEmail] = useState("");
  const [testTitle, setTestTitle] = useState("Test Notification");
  const [testBody, setTestBody] = useState("This is a test push notification from your HRMS app!");
  const [sending, setSending] = useState(false);

  const handleRegisterDevice = async () => {
    if (!deviceToken) {
      toast.error("Please enter a device token");
      return;
    }

    setRegistering(true);
    try {
      const response = await base44.functions.invoke('registerDevice', {
        device_token: deviceToken,
        device_type: deviceType,
        device_name: deviceName || `${deviceType} Device`
      });

      if (response.data?.success) {
        toast.success("Device registered successfully!");
        setRegistered(true);
      } else {
        toast.error(response.data?.error || "Failed to register device");
      }
    } catch (error) {
      toast.error("Failed to register device");
      console.error(error);
    }
    setRegistering(false);
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Please enter user email");
      return;
    }

    setSending(true);
    try {
      const response = await base44.functions.invoke('sendPushNotification', {
        user_email: testEmail,
        title: testTitle,
        body: testBody,
        data: {
          test: true
        }
      });

      if (response.data?.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data?.message || "Failed to send notification");
      }
    } catch (error) {
      toast.error("Failed to send notification");
      console.error(error);
    }
    setSending(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Push Notification Testing</h2>
        <p className="text-slate-500">Test Firebase Cloud Messaging integration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Register Device */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Register Device
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Device Token (FCM Token)</Label>
              <Textarea
                value={deviceToken}
                onChange={(e) => setDeviceToken(e.target.value)}
                placeholder="Paste your FCM device token here..."
                rows={3}
              />
              <p className="text-xs text-slate-500">
                Get this from your mobile app after FCM initialization
              </p>
            </div>

            <div className="space-y-2">
              <Label>Device Type</Label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="android">Android</option>
                <option value="ios">iOS</option>
                <option value="web">Web</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Device Name (Optional)</Label>
              <Input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g., Samsung Galaxy S21"
              />
            </div>

            <Button
              onClick={handleRegisterDevice}
              disabled={registering || !deviceToken}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {registering ? "Registering..." : "Register Device"}
            </Button>

            {registered && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-700">Device registered successfully!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send Test Notification */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-600" />
              Send Test Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>User Email</Label>
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="user@example.com"
                type="email"
              />
              <p className="text-xs text-slate-500">
                Email of user with registered device
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notification Title</Label>
              <Input
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Test Notification"
              />
            </div>

            <div className="space-y-2">
              <Label>Notification Body</Label>
              <Textarea
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                placeholder="Your notification message..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleSendTest}
              disabled={sending || !testEmail}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {sending ? "Sending..." : "Send Test Notification"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Integration Guide */}
      <Card className="border-0 shadow-sm bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Bell className="w-5 h-5" />
            Mobile App Integration Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">Capacitor (Recommended)</h4>
            <pre className="bg-blue-900 text-blue-50 p-4 rounded-lg text-xs overflow-x-auto">
{`import { PushNotifications } from '@capacitor/push-notifications';
import { base44 } from '@/api/base44Client';

// Request permission and register
await PushNotifications.requestPermissions();
await PushNotifications.register();

// Get token and register with backend
PushNotifications.addListener('registration', async (token) => {
  await base44.functions.invoke('registerDevice', {
    device_token: token.value,
    device_type: 'android', // or 'ios'
    device_name: 'My Device Name'
  });
});

// Handle notifications
PushNotifications.addListener('pushNotificationReceived', (notification) => {
  console.log('Notification:', notification);
});`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold text-blue-800 mb-2">React Native Firebase</h4>
            <pre className="bg-blue-900 text-blue-50 p-4 rounded-lg text-xs overflow-x-auto">
{`import messaging from '@react-native-firebase/messaging';
import { base44 } from '@/api/base44Client';

// Request permission
await messaging().requestPermission();

// Get token
const token = await messaging().getToken();

// Register with backend
await base44.functions.invoke('registerDevice', {
  device_token: token,
  device_type: Platform.OS, // 'android' or 'ios'
  device_name: DeviceInfo.getModel()
});`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}