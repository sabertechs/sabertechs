import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Save, Video } from "lucide-react";

export default function LMSConfiguration() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    video_url: "",
    title: "Freelancer Training",
    time_limit_minutes: 30,
    marks_per_question: 1,
    passing_percentage: 50,
    questions: []
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['lmsSettings'],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: 'lms_config' }),
  });

  useEffect(() => {
    if (settings.length > 0 && settings[0].setting_value) {
      setConfig(settings[0].setting_value);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings.length > 0) {
        return base44.entities.AppSettings.update(settings[0].id, {
          setting_value: data
        });
      } else {
        return base44.entities.AppSettings.create({
          setting_key: 'lms_config',
          setting_value: data,
          description: 'LMS video and test configuration'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lmsSettings']);
      toast.success('LMS configuration saved successfully');
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast.error('Failed to save: ' + (error.message || 'Unknown error'));
    }
  });

  const handleSave = async () => {
    console.log('Save clicked, config:', config);
    
    if (!config.video_url) {
      toast.error('Video URL is required');
      return;
    }
    if (config.questions.length === 0) {
      toast.error('At least one question is required');
      return;
    }
    
    // Validate questions
    for (let i = 0; i < config.questions.length; i++) {
      const q = config.questions[i];
      if (!q.question || !q.question.trim()) {
        toast.error(`Question ${i + 1} text is required`);
        return;
      }
      if (q.options.some(opt => !opt || !opt.trim())) {
        toast.error(`All options for Question ${i + 1} must be filled`);
        return;
      }
    }
    
    console.log('Validation passed, saving...');
    try {
      await saveMutation.mutateAsync(config);
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const addQuestion = () => {
    setConfig(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question: "",
          options: ["", "", "", ""],
          correct_option: 0
        }
      ]
    }));
  };

  const updateQuestion = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const updateOption = (qIndex, oIndex, value) => {
    setConfig(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === qIndex ? {
          ...q,
          options: q.options.map((opt, j) => j === oIndex ? value : opt)
        } : q
      )
    }));
  };

  const removeQuestion = (index) => {
    setConfig(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Video URL *</Label>
          <div className="relative">
            <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="https://youtube.com/watch?v=... or direct video URL"
              value={config.video_url}
              onChange={(e) => setConfig({ ...config, video_url: e.target.value })}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-slate-500">YouTube link or direct video URL (mp4, webm)</p>
        </div>

        <div className="space-y-2">
          <Label>Test Title</Label>
          <Input
            placeholder="Freelancer Training Test"
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Time Limit (minutes)</Label>
          <Input
            type="number"
            min="1"
            value={config.time_limit_minutes}
            onChange={(e) => setConfig({ ...config, time_limit_minutes: parseInt(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label>Marks Per Question</Label>
          <Input
            type="number"
            min="1"
            value={config.marks_per_question}
            onChange={(e) => setConfig({ ...config, marks_per_question: parseInt(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label>Passing Percentage</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={config.passing_percentage}
            onChange={(e) => setConfig({ ...config, passing_percentage: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Test Questions</h3>
          <Button onClick={addQuestion} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-1" />
            Add Question
          </Button>
        </div>

        <div className="space-y-4">
          {config.questions.map((q, qIndex) => (
            <Card key={qIndex} className="border-2">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Label>Question {qIndex + 1}</Label>
                      <Textarea
                        placeholder="Enter question..."
                        value={q.question}
                        onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(qIndex)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Options</Label>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={q.correct_option === oIndex}
                          onChange={() => updateQuestion(qIndex, 'correct_option', oIndex)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <Input
                          placeholder={`Option ${oIndex + 1}`}
                          value={opt}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        />
                      </div>
                    ))}
                    <p className="text-xs text-slate-500">Select the correct answer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save LMS Configuration'}
        </Button>
      </div>
    </div>
  );
}