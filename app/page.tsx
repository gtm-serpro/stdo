'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Target, TrendingUp, Brain, Plus, AlertTriangle, Award } from 'lucide-react';

// Tipos
interface Subject {
  id: string;
  nome: string;
  questoes: number;
  tipo: 'geral' | 'especifico';
  dificuldade: number;
  horasEstudadas: number;
  metaHoras: number;
  prioridade: number;
}

interface Exercise {
  id: number;
  subject: string;
  correct: number;
  total: number;
  percentage: number;
  topics: string[];
  date: string;
}

interface KnowledgeLevels {
  [key: string]: number;
}

interface PriorityData {
  priority: string;
  performanceGap: string;
  knowledgeGap: number;
  studyGap: string;
  avgPerformance: string;
}

// Matérias do edital com pesos reais
const MATERIAS_EDITAL = [
  { nome: 'Língua Portuguesa', questoes: 20, tipo: 'geral' as const, dificuldade: 3 },
  { nome: 'Raciocínio Lógico e Analítico', questoes: 15, tipo: 'geral' as const, dificuldade: 4 },
  { nome: 'Direito Administrativo', questoes: 20, tipo: 'geral' as const, dificuldade: 4 },
  { nome: 'Administração Pública', questoes: 15, tipo: 'geral' as const, dificuldade: 3 },
  { nome: 'Noções de Informática', questoes: 10, tipo: 'geral' as const, dificuldade: 2 },
  { nome: 'Atualidades', questoes: 10, tipo: 'geral' as const, dificuldade: 2 },
  { nome: 'Regimento Interno da Câmara', questoes: 30, tipo: 'especifico' as const, dificuldade: 5 },
  { nome: 'Direito Constitucional', questoes: 25, tipo: 'especifico' as const, dificuldade: 4 },
  { nome: 'Processo Legislativo', questoes: 20, tipo: 'especifico' as const, dificuldade: 4 },
  { nome: 'Gestão Pública e Orçamento', questoes: 15, tipo: 'especifico' as const, dificuldade: 4 },
];

export default function ConcursoStudySystem() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [knowledgeLevels, setKnowledgeLevels] = useState<KnowledgeLevels>({});
  const [claudeAnalysis, setClaudeAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [newExercise, setNewExercise] = useState({ subject: '', correct: '0', total: '0', topics: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storage = (window as unknown as { storage: { get: (key: string) => Promise<{ value: string } | null> } }).storage;
      const subjectsData = await storage.get('concurso-subjects-v2');
      const exercisesData = await storage.get('concurso-exercises-v2');
      const levelsData = await storage.get('concurso-levels');
      
      if (subjectsData) {
        setSubjects(JSON.parse(subjectsData.value));
        setInitialized(true);
      }
      if (exercisesData) setExercises(JSON.parse(exercisesData.value));
      if (levelsData) setKnowledgeLevels(JSON.parse(levelsData.value));
    } catch {
      console.log('Primeira vez usando o sistema');
    }
  };

  const saveData = async (updatedSubjects?: Subject[], updatedExercises?: Exercise[], updatedLevels?: KnowledgeLevels) => {
    try {
      const storage = (window as unknown as { storage: { set: (key: string, value: string) => Promise<void> } }).storage;
      if (updatedSubjects) await storage.set('concurso-subjects-v2', JSON.stringify(updatedSubjects));
      if (updatedExercises) await storage.set('concurso-exercises-v2', JSON.stringify(updatedExercises));
      if (updatedLevels) await storage.set('concurso-levels', JSON.stringify(updatedLevels));
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const initializeSubjects = () => {
    const initialSubjects: Subject[] = MATERIAS_EDITAL.map(m => ({
      id: m.nome,
      nome: m.nome,
      questoes: m.questoes,
      tipo: m.tipo,
      dificuldade: m.dificuldade,
      horasEstudadas: 0,
      metaHoras: Math.ceil(m.questoes * 0.5),
      prioridade: 0
    }));
    
    setSubjects(initialSubjects);
    setInitialized(true);
    saveData(initialSubjects, exercises, knowledgeLevels);
  };

  const updateKnowledgeLevel = (subjectName: string, level: string) => {
    const updated = { ...knowledgeLevels, [subjectName]: parseInt(level) };
    setKnowledgeLevels(updated);
    saveData(subjects, exercises, updated);
  };

  const addExercise = () => {
    const correct = parseInt(newExercise.correct);
    const total = parseInt(newExercise.total);
    
    if (!newExercise.subject || total === 0) return;
    
    const exercise: Exercise = {
      id: Date.now(),
      subject: newExercise.subject,
      correct,
      total,
      percentage: (correct / total) * 100,
      topics: newExercise.topics.split(',').map(t => t.trim()).filter(Boolean),
      date: new Date().toISOString()
    };
    
    const updated = [...exercises, exercise];
    setExercises(updated);
    saveData(subjects, updated, knowledgeLevels);
    setNewExercise({ subject: '', correct: '0', total: '0', topics: '' });
  };

  const addStudyHours = (subjectId: string, hours: number) => {
    const updated = subjects.map(s => 
      s.id === subjectId ? { ...s, horasEstudadas: s.horasEstudadas + hours } : s
    );
    setSubjects(updated);
    saveData(updated, exercises, knowledgeLevels);
  };

  const calculatePriority = (subject: Subject): PriorityData => {
    const subjectExercises = exercises.filter(e => e.subject === subject.nome);
    
    const avgPerformance = subjectExercises.length > 0
      ? subjectExercises.reduce((acc, e) => acc + e.percentage, 0) / subjectExercises.length
      : 50;
    const performanceGap = 100 - avgPerformance;
    
    const knowledgeLevel = knowledgeLevels[subject.nome] || 5;
    const knowledgeGap = 10 - knowledgeLevel;
    
    const weight = subject.questoes;
    const difficulty = subject.dificuldade;
    const studyGap = Math.max(0, subject.metaHoras - subject.horasEstudadas);
    const typeMultiplier = subject.tipo === 'especifico' ? 1.2 : 1.0;
    
    const basePriority = 
      (performanceGap * 0.3) + 
      (knowledgeGap * 10 * 0.25) + 
      (studyGap * 2 * 0.2);
    
    const priority = basePriority * (weight / 10) * (difficulty / 3) * typeMultiplier;
    
    return {
      priority: priority.toFixed(2),
      performanceGap: performanceGap.toFixed(1),
      knowledgeGap,
      studyGap: studyGap.toFixed(1),
      avgPerformance: avgPerformance.toFixed(1)
    };
  };

  const getPrioritySubjects = () => {
    return subjects
      .map(s => ({
        ...s,
        priorityData: calculatePriority(s)
      }))
      .sort((a, b) => parseFloat(b.priorityData.priority) - parseFloat(a.priorityData.priority));
  };

  const analyzeWithClaude = async () => {
    setLoading(true);
    setClaudeAnalysis('Analisando seus dados com IA...');
    
    try {
      const priorityList = getPrioritySubjects().slice(0, 10);
      
      const subjectsData = priorityList.map(s => ({
        nome: s.nome,
        questoes: s.questoes,
        tipo: s.tipo,
        horasEstudadas: s.horasEstudadas,
        metaHoras: s.metaHoras,
        nivelConhecimento: knowledgeLevels[s.nome] || 'não informado',
        prioridade: s.priorityData.priority,
        performanceMédia: s.priorityData.avgPerformance + '%',
        exercíciosFeitos: exercises.filter(e => e.subject === s.nome).length
      }));

      const recentExercises = exercises.slice(-15).map(e => ({
        materia: e.subject,
        acertos: e.correct,
        total: e.total,
        percentual: e.percentage.toFixed(1) + '%',
        assuntosErrados: e.topics
      }));

      const prompt = `Você é um especialista em concursos públicos e coaching de estudos. Analise o desempenho do candidato no concurso da Câmara dos Deputados (Analista Legislativo).

DADOS DO CONCURSO:
- Total: 180 questões (90 gerais + 90 específicas)
- Sistema: Certo/Errado (Cebraspe)
- Prova discursiva: 60 pontos
- Nota mínima para passar: ~60-70% de acerto

MATÉRIAS PRIORITÁRIAS (com score de prioridade calculado):
${JSON.stringify(subjectsData, null, 2)}

EXERCÍCIOS RECENTES:
${JSON.stringify(recentExercises, null, 2)}

CONTEXTO:
O candidato está usando um sistema de priorização que considera: performance em exercícios, nível de conhecimento declarado, peso da matéria no edital, dificuldade e progresso nos estudos.

ANÁLISE SOLICITADA:
1. **Diagnóstico Geral**: Avalie o nível atual de preparação e probabilidade de aprovação
2. **Top 5 Prioridades**: Liste as 5 matérias que ele DEVE focar nos próximos 15 dias
3. **Pontos Fracos Críticos**: Identifique assuntos específicos onde ele está errando muito
4. **Plano de Ação Semanal**: Sugira distribuição de horas de estudo
5. **Dicas Estratégicas**: Conselhos específicos para melhorar rapidamente

Seja DIRETO, PRÁTICO e MOTIVADOR. Use números e seja específico.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json() as { content: Array<{ type: string; text?: string }> };
      const analysis = data.content.find((c) => c.type === 'text')?.text || 'Não foi possível gerar análise';
      setClaudeAnalysis(analysis);
    } catch (error) {
      setClaudeAnalysis('Erro ao conectar com Claude. Verifique sua conexão.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    const totalQuestoes = 180;
    const totalExercicios = exercises.length;
    const mediaParcial = exercises.length > 0
      ? exercises.reduce((acc, e) => acc + e.percentage, 0) / exercises.length
      : 0;
    
    const horasTotais = subjects.reduce((acc, s) => acc + s.horasEstudadas, 0);
    const metaTotalHoras = subjects.reduce((acc, s) => acc + s.metaHoras, 0);
    
    return {
      totalQuestoes,
      totalExercicios,
      mediaParcial: mediaParcial.toFixed(1),
      horasTotais,
      metaTotalHoras,
      progressoHoras: metaTotalHoras > 0 ? ((horasTotais / metaTotalHoras) * 100).toFixed(1) : '0'
    };
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Bem-vindo ao Sistema de Estudos</CardTitle>
            <CardDescription>Concurso Câmara dos Deputados - Analista Legislativo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Edital carregado:</strong> 180 questões (90 gerais + 90 específicas)<br/>
                Sistema Cebraspe (Certo/Errado com penalização)<br/>
                Salário: R$ 30.853,99
              </AlertDescription>
            </Alert>
            <p className="text-gray-600">
              O sistema foi pré-configurado com todas as matérias do edital, seus pesos e dificuldades.
              Vamos começar sua jornada rumo à aprovação!
            </p>
            <Button onClick={initializeSubjects} className="w-full" size="lg">
              <BookOpen className="h-5 w-5 mr-2" />
              Iniciar Preparação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = getTotalStats();
  const prioritySubjects = getPrioritySubjects();

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center py-6">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">Sistema de Estudos Inteligente</h1>
          <p className="text-indigo-600">Câmara dos Deputados - Analista Legislativo | R$ 30.853,99</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Horas Estudadas</CardTitle>
              <BookOpen className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.horasTotais}h</div>
              <p className="text-xs text-gray-500">Meta: {stats.metaTotalHoras}h ({stats.progressoHoras}%)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Exercícios</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExercicios}</div>
              <p className="text-xs text-gray-500">Questões praticadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.mediaParcial}%</div>
              <p className="text-xs text-gray-500">Nos exercícios</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Award className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {parseFloat(stats.mediaParcial) >= 70 ? '🎯' : parseFloat(stats.mediaParcial) >= 60 ? '📚' : '⚠️'}
              </div>
              <p className="text-xs text-gray-500">
                {parseFloat(stats.mediaParcial) >= 70 ? 'Excelente!' : parseFloat(stats.mediaParcial) >= 60 ? 'No caminho' : 'Precisa focar'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="priorities" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="priorities">Prioridades</TabsTrigger>
            <TabsTrigger value="subjects">Matérias</TabsTrigger>
            <TabsTrigger value="exercises">Exercícios</TabsTrigger>
            <TabsTrigger value="analysis">Análise IA</TabsTrigger>
          </TabsList>

          <TabsContent value="priorities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Prioridades de Estudo</CardTitle>
                <CardDescription>
                  Calculado por: Performance + Conhecimento + Peso no Edital + Dificuldade + Progresso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {prioritySubjects.slice(0, 10).map((subject, idx) => (
                  <div key={subject.id} className="border-l-4 border-indigo-500 pl-4 py-3 bg-white rounded-r">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-bold text-lg">#{idx + 1} {subject.nome}</span>
                        <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">
                          {subject.questoes} questões
                        </span>
                        <span className="ml-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          {subject.tipo === 'especifico' ? 'Específica' : 'Geral'}
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-indigo-600">
                        {subject.priorityData.priority}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                      <div>Performance: {subject.priorityData.avgPerformance}%</div>
                      <div>Conhecimento: {knowledgeLevels[subject.nome] || 'não informado'}/10</div>
                      <div>Estudado: {subject.horasEstudadas}h / {subject.metaHoras}h</div>
                      <div>Dificuldade: {'⭐'.repeat(subject.dificuldade)}</div>
                    </div>
                    
                    <Progress 
                      value={(subject.horasEstudadas / subject.metaHoras) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            <div className="grid gap-4">
              {prioritySubjects.map(subject => (
                <Card key={subject.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{subject.nome}</CardTitle>
                        <CardDescription>
                          {subject.questoes} questões • Prioridade: {subject.priorityData.priority}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Seu nível</div>
                        <select
                          className="border rounded px-2 py-1"
                          value={knowledgeLevels[subject.nome] || 5}
                          onChange={(e) => updateKnowledgeLevel(subject.nome, e.target.value)}
                        >
                          {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                            <option key={n} value={n}>{n}/10</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Performance</div>
                        <div className="font-bold">{subject.priorityData.avgPerformance}%</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Progresso</div>
                        <div className="font-bold">{subject.horasEstudadas}h / {subject.metaHoras}h</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Dificuldade</div>
                        <div className="font-bold">{'⭐'.repeat(subject.dificuldade)}</div>
                      </div>
                    </div>
                    <Progress value={(subject.horasEstudadas / subject.metaHoras) * 100} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => addStudyHours(subject.id, 1)}>+1h</Button>
                      <Button size="sm" onClick={() => addStudyHours(subject.id, 2)}>+2h</Button>
                      <Button size="sm" onClick={() => addStudyHours(subject.id, 4)}>+4h</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="exercises" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Exercício</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <select
                  className="w-full p-2 border rounded"
                  value={newExercise.subject}
                  onChange={(e) => setNewExercise({ ...newExercise, subject: e.target.value })}
                >
                  <option value="">Selecione a matéria</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.nome}>{s.nome}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Acertos"
                    value={newExercise.correct}
                    onChange={(e) => setNewExercise({ ...newExercise, correct: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Total"
                    value={newExercise.total}
                    onChange={(e) => setNewExercise({ ...newExercise, total: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Assuntos que errou (opcional)"
                  value={newExercise.topics}
                  onChange={(e) => setNewExercise({ ...newExercise, topics: e.target.value })}
                />
                <Button onClick={addExercise} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Registrar
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exercises.slice().reverse().map(exercise => (
                    <div key={exercise.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{exercise.subject}</span>
                        <span className={`font-bold ${exercise.percentage >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                          {exercise.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{exercise.correct}/{exercise.total} questões</p>
                      {exercise.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {exercise.topics.map((topic, idx) => (
                            <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(exercise.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Brain className="h-6 w-6 text-indigo-600" />
                  <CardTitle>Análise Inteligente com Claude</CardTitle>
                </div>
                <CardDescription>
                  Claude analisará seu desempenho e criará um plano estratégico personalizado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={analyzeWithClaude} 
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Analisando...' : 'Gerar Análise Estratégica'}
                </Button>

                {claudeAnalysis && (
                  <Alert>
                    <AlertDescription className="whitespace-pre-wrap">
                      {claudeAnalysis}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}