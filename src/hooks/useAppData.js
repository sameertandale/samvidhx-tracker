import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/storage'
import { rollUp } from '../lib/scoring'
import { generateId } from '../lib/uid'
import { DEFAULT_CONFIG } from '../lib/constants'

const initialState = {
  config: DEFAULT_CONFIG,
  partners: [],
  projects: [],
  milestones: [],
  epics: [],
  tasks: [],
  rollup: { epicRollup: {}, milestoneRollup: {}, projectRollup: {}, partnerTotals: {}, portfolioTotal: 0, suggestedShare: {} },
  loading: true,
  error: null,
}

function recompute(tasks, epics, milestones, projects, config) {
  return rollUp(tasks, epics, milestones, projects, config)
}

export function useAppData() {
  const [state, setState] = useState(initialState)

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const [config, partners, projects, milestones, epics] = await Promise.all([
        db.get('config'),
        db.get('partners'),
        db.get('projects'),
        db.get('milestones'),
        db.get('epics'),
      ])

      const resolvedConfig = config ?? DEFAULT_CONFIG
      const resolvedEpics = epics ?? []

      // Load tasks for each epic
      const taskArrays = await Promise.all(
        resolvedEpics.map(epic => db.get(`tasks:${epic.id}`))
      )
      const tasks = taskArrays.flatMap((arr, i) =>
        (arr ?? []).map(t => ({ ...t, epicId: resolvedEpics[i].id }))
      )

      const allProjects = projects ?? []
      const allMilestones = milestones ?? []
      const ru = recompute(tasks, resolvedEpics, allMilestones, allProjects, resolvedConfig)

      setState({
        config: resolvedConfig,
        partners: partners ?? [],
        projects: allProjects,
        milestones: allMilestones,
        epics: resolvedEpics,
        tasks,
        rollup: ru,
        loading: false,
        error: null,
      })
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.message }))
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Generic state updater that also recomputes rollup
  const update = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      const ru = recompute(next.tasks, next.epics, next.milestones, next.projects, next.config)
      return { ...next, rollup: ru }
    })
  }, [])

  // --- Partners ---
  const savePartner = useCallback(async (partner) => {
    const current = await db.get('partners') ?? []
    const idx = current.findIndex(p => p.id === partner.id)
    const next = idx >= 0
      ? current.map(p => p.id === partner.id ? partner : p)
      : [...current, partner]
    await db.set('partners', next)
    update(s => ({ ...s, partners: next }))
  }, [update])

  const addPartner = useCallback(async (data) => {
    const partner = { ...data, id: generateId('p'), createdAt: new Date().toISOString() }
    await savePartner(partner)
    return partner
  }, [savePartner])

  const updatePartner = useCallback(async (partner) => {
    await savePartner(partner)
  }, [savePartner])

  const deletePartner = useCallback(async (id) => {
    const current = await db.get('partners') ?? []
    const next = current.filter(p => p.id !== id)
    await db.set('partners', next)
    update(s => ({ ...s, partners: next }))
  }, [update])

  // --- Projects ---
  const addProject = useCallback(async (data) => {
    const project = { ...data, id: generateId('prj'), createdAt: new Date().toISOString() }
    const current = await db.get('projects') ?? []
    const next = [...current, project]
    await db.set('projects', next)
    update(s => ({ ...s, projects: next }))
    return project
  }, [update])

  const updateProject = useCallback(async (project) => {
    const current = await db.get('projects') ?? []
    const next = current.map(p => p.id === project.id ? project : p)
    await db.set('projects', next)
    update(s => ({ ...s, projects: next }))
  }, [update])

  const deleteProject = useCallback(async (id) => {
    // Cascade: delete all milestones, epics, tasks
    const current = await db.get('projects') ?? []
    const allMilestones = await db.get('milestones') ?? []
    const allEpics = await db.get('epics') ?? []

    const msToDel = allMilestones.filter(m => m.projectId === id)
    const epicsToDel = allEpics.filter(e => msToDel.some(m => m.id === e.milestoneId))

    await Promise.all(epicsToDel.map(e => db.delete(`tasks:${e.id}`)))
    const nextEpics = allEpics.filter(e => !epicsToDel.some(d => d.id === e.id))
    await db.set('epics', nextEpics)
    const nextMs = allMilestones.filter(m => m.projectId !== id)
    await db.set('milestones', nextMs)
    const nextProjects = current.filter(p => p.id !== id)
    await db.set('projects', nextProjects)

    update(s => ({
      ...s,
      projects: nextProjects,
      milestones: nextMs,
      epics: nextEpics,
      tasks: s.tasks.filter(t => !epicsToDel.some(e => e.id === t.epicId)),
    }))
  }, [update])

  // --- Milestones ---
  const addMilestone = useCallback(async (data) => {
    const milestone = { ...data, id: generateId('mls'), createdAt: new Date().toISOString() }
    const current = await db.get('milestones') ?? []
    const next = [...current, milestone]
    await db.set('milestones', next)
    update(s => ({ ...s, milestones: next }))
    return milestone
  }, [update])

  const updateMilestone = useCallback(async (milestone) => {
    const current = await db.get('milestones') ?? []
    const next = current.map(m => m.id === milestone.id ? milestone : m)
    await db.set('milestones', next)
    update(s => ({ ...s, milestones: next }))
  }, [update])

  const deleteMilestone = useCallback(async (id) => {
    const allMilestones = await db.get('milestones') ?? []
    const allEpics = await db.get('epics') ?? []
    const epicsToDel = allEpics.filter(e => e.milestoneId === id)

    await Promise.all(epicsToDel.map(e => db.delete(`tasks:${e.id}`)))
    const nextEpics = allEpics.filter(e => e.milestoneId !== id)
    await db.set('epics', nextEpics)
    const nextMs = allMilestones.filter(m => m.id !== id)
    await db.set('milestones', nextMs)

    update(s => ({
      ...s,
      milestones: nextMs,
      epics: nextEpics,
      tasks: s.tasks.filter(t => !epicsToDel.some(e => e.id === t.epicId)),
    }))
  }, [update])

  // --- Epics ---
  const addEpic = useCallback(async (data) => {
    const epic = { ...data, id: generateId('epc'), createdAt: new Date().toISOString() }
    const current = await db.get('epics') ?? []
    const next = [...current, epic]
    await db.set('epics', next)
    update(s => ({ ...s, epics: next }))
    return epic
  }, [update])

  const updateEpic = useCallback(async (epic) => {
    const current = await db.get('epics') ?? []
    const next = current.map(e => e.id === epic.id ? epic : e)
    await db.set('epics', next)
    update(s => ({ ...s, epics: next }))
  }, [update])

  const deleteEpic = useCallback(async (id) => {
    const allEpics = await db.get('epics') ?? []
    await db.delete(`tasks:${id}`)
    const nextEpics = allEpics.filter(e => e.id !== id)
    await db.set('epics', nextEpics)
    update(s => ({
      ...s,
      epics: nextEpics,
      tasks: s.tasks.filter(t => t.epicId !== id),
    }))
  }, [update])

  // --- Tasks ---
  const addTask = useCallback(async (data) => {
    const task = { ...data, id: generateId('tsk'), createdAt: new Date().toISOString() }
    const current = await db.get(`tasks:${task.epicId}`) ?? []
    const next = [...current, task]
    await db.set(`tasks:${task.epicId}`, next)
    update(s => ({ ...s, tasks: [...s.tasks, task] }))
    return task
  }, [update])

  const updateTask = useCallback(async (task) => {
    // Re-read before write
    const current = await db.get(`tasks:${task.epicId}`) ?? []
    const next = current.map(t => t.id === task.id ? task : t)
    await db.set(`tasks:${task.epicId}`, next)
    update(s => ({ ...s, tasks: s.tasks.map(t => t.id === task.id ? task : t) }))
  }, [update])

  const deleteTask = useCallback(async (task) => {
    const current = await db.get(`tasks:${task.epicId}`) ?? []
    const next = current.filter(t => t.id !== task.id)
    await db.set(`tasks:${task.epicId}`, next)
    update(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== task.id) }))
  }, [update])

  // --- Config ---
  const saveConfig = useCallback(async (config) => {
    await db.set('config', config)
    update(s => ({ ...s, config }))
  }, [update])

  return {
    ...state,
    reload: load,
    addPartner, updatePartner, deletePartner,
    addProject, updateProject, deleteProject,
    addMilestone, updateMilestone, deleteMilestone,
    addEpic, updateEpic, deleteEpic,
    addTask, updateTask, deleteTask,
    saveConfig,
  }
}
