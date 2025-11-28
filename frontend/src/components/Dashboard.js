import React, { useState, useEffect } from 'react';
import { handleApiError, showErrorToast, showSuccessToast } from '../utils/errorHandler';

const Dashboard = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tasks/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const tasksData = await handleApiError(response);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showErrorToast('Failed to load tasks');
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tasks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTask)
      });
      await handleApiError(response);
      setNewTask({ title: '', description: '' });
      fetchTasks();
      showSuccessToast('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      showErrorToast('Failed to create task');
    }
  };

  const completeTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await handleApiError(response);
      fetchTasks();
      showSuccessToast('Task completed');
    } catch (error) {
      console.error('Error completing task:', error);
      showErrorToast('Failed to complete task');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await handleApiError(response);
      fetchTasks();
      showSuccessToast('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      showErrorToast('Failed to delete task');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Todo App</h1>
        <p>Добро пожаловать, {user.email}!</p>
        <button onClick={onLogout} className="btn-danger">Выйти</button>
      </header>

      <div className="container">
        <div className="task-form">
          <h2>Добавить задачу</h2>
          <form onSubmit={createTask}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Название задачи"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <textarea
                placeholder="Описание"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              />
            </div>
            <button type="submit" className="btn-primary">Добавить</button>
          </form>
        </div>

        <div className="tasks-list">
          <h2>Мои задачи ({tasks.length})</h2>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <p>Задач пока нет</p>
            </div>
          ) : (
            <div className="tasks-grid">
              {tasks.map(task => (
                <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''}`}>
                  <div className="task-header">
                    <h3>{task.title}</h3>
                    <span className={`status-badge ${task.completed ? 'completed' : 'pending'}`}>
                      {task.completed ? '✅ Выполнена' : '⏳ Ожидает'}
                    </span>
                  </div>
                  <p className="task-description">{task.description}</p>
                  <div className="task-meta">
                    <span>Создано: {new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="task-actions">
                    {!task.completed && (
                      <button 
                        onClick={() => completeTask(task.id)} 
                        className="btn-success"
                      >
                        ✅ Отметить выполненной
                      </button>
                    )}
                    <button 
                      onClick={() => deleteTask(task.id)} 
                      className="btn-danger"
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;