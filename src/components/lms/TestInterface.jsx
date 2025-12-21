import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Award } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function TestInterface({ test, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(test.time_limit_minutes * 60);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (submitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted]);

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);

    // Calculate score
    let score = 0;
    const questions = test.questions || [];
    const userAnswers = [];

    questions.forEach((q, idx) => {
      const userAnswer = answers[idx];
      const isCorrect = userAnswer === q.correct_option;
      if (isCorrect) {
        score += test.marks_per_question || 1;
      }
      userAnswers.push({
        question: q.question,
        selected: userAnswer !== undefined ? q.options[userAnswer] : "Not answered",
        correct: q.options[q.correct_option],
        is_correct: isCorrect
      });
    });

    const totalMarks = questions.length * (test.marks_per_question || 1);
    const percentage = (score / totalMarks) * 100;
    const passed = percentage >= (test.passing_percentage || 50);
    const timeTaken = (test.time_limit_minutes * 60) - timeLeft;

    const resultData = {
      score,
      total_marks: totalMarks,
      percentage: Math.round(percentage),
      passed,
      time_taken_seconds: timeTaken,
      answers: userAnswers
    };

    setResult(resultData);

    // Save to database
    try {
      const user = await base44.auth.me();
      await base44.entities.TestResult.create({
        employee_email: user.email,
        employee_name: user.full_name,
        test_id: test.id || "lms_test",
        test_title: test.title || "LMS Test",
        ...resultData
      });
      toast.success("Test submitted successfully!");
    } catch (error) {
      console.error("Error saving test result:", error);
    }

    if (onComplete) onComplete(resultData);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const questions = test.questions || [];

  if (submitted && result) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            result.passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {result.passed ? (
              <CheckCircle className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {result.passed ? 'Congratulations! 🎉' : 'Test Completed'}
          </CardTitle>
          <p className="text-slate-500">
            {result.passed ? 'You passed the test!' : 'Keep learning and try again!'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-indigo-50 rounded-xl">
              <Award className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-indigo-600">{result.score}</p>
              <p className="text-sm text-slate-500">Score</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">{result.percentage}%</div>
              <p className="text-sm text-slate-500">Percentage</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{formatTime(result.time_taken_seconds)}</p>
              <p className="text-sm text-slate-500">Time Taken</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Review Answers:</h3>
            {result.answers.map((ans, idx) => (
              <Card key={idx} className={`border-2 ${
                ans.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    {ans.is_correct ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 mb-2">Q{idx + 1}. {ans.question}</p>
                      <div className="space-y-1 text-sm">
                        <p className={ans.is_correct ? 'text-green-700' : 'text-red-700'}>
                          Your answer: {ans.selected}
                        </p>
                        {!ans.is_correct && (
                          <p className="text-green-700">Correct answer: {ans.correct}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const question = questions[currentQuestion];
  const totalQuestions = questions.length;
  const allAnswered = Object.keys(answers).length === totalQuestions;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Question {currentQuestion + 1} of {totalQuestions}
          </Badge>
          <Badge className={`text-lg px-4 py-2 ${
            timeLeft < 60 ? 'bg-red-600' : 'bg-indigo-600'
          }`}>
            <Clock className="w-4 h-4 mr-2" />
            {formatTime(timeLeft)}
          </Badge>
        </div>
        <CardTitle className="text-xl">{question?.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={answers[currentQuestion]?.toString()}
          onValueChange={(value) => handleAnswerSelect(currentQuestion, parseInt(value))}
        >
          {question?.options?.map((option, idx) => (
            <div key={idx} className="flex items-center space-x-3 p-4 rounded-lg hover:bg-slate-50 border border-slate-200">
              <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
              <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          
          {currentQuestion < totalQuestions - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(prev => prev + 1)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="bg-green-600 hover:bg-green-700"
            >
              Submit Test
            </Button>
          )}
        </div>

        <div className="text-center text-sm text-slate-500">
          {Object.keys(answers).length} of {totalQuestions} questions answered
        </div>
      </CardContent>
    </Card>
  );
}