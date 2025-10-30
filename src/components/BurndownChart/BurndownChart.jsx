import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import './BurndownChart.css';

const BurndownChart = ({ tasks, sprint }) => {

  const chartData = useMemo(() => {
    if (!sprint.startDate || !sprint.endDate || !tasks) {
      return [];
    }

    const { startDate, endDate } = sprint;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate total days in sprint
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (totalDays <= 0) return [];

    // Calculate total story points
    const totalSP = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
    if (totalSP === 0) return []; // No points to burn down

    const idealPointsPerDay = totalSP / (totalDays - 1 > 0 ? totalDays - 1 : 1);
    
    const data = [];

    for (let i = 0; i < totalDays; i++) {
      const currentDay = new Date(start);
      currentDay.setDate(start.getDate() + i);
      const dayString = `Day ${i}`;

      // Calculate ideal burndown
      const idealRemaining = Math.max(0, totalSP - (idealPointsPerDay * i));

      // Calculate actual burndown
      const completedPoints = tasks.reduce((sum, task) => {
        // Check if task was completed *on or before* this day
        if (task.completedAt && task.completedAt.toDate() <= currentDay) {
          return sum + (task.storyPoints || 0);
        }
        return sum;
      }, 0);
      
      const actualRemaining = totalSP - completedPoints;

      data.push({
        name: dayString,
        Ideal: idealRemaining,
        Actual: actualRemaining,
      });
    }

    return data;
  }, [tasks, sprint]);

  if (chartData.length === 0) {
    return (
      <div className="burndown-container empty">
        <p>No story points on tasks, or sprint dates are missing. Add story points to tasks to see the burndown chart.</p>
      </div>
    );
  }

  return (
    <div className="burndown-container">
      <h3>Sprint Burndown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="Ideal" 
            stroke="#8884d8" 
            strokeDasharray="5 5"
          />
          <Line 
            type="monotone" 
            dataKey="Actual" 
            stroke="#82ca9d" 
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BurndownChart;