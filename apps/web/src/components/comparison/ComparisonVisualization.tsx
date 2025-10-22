import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, Paper, Typography, Tabs, Tab } from '@mui/material';

interface ComparisonPoint {
  md: number;
  reference: {
    inc: number;
    azi: number;
    north: number;
    east: number;
    tvd: number;
  };
  comparative: {
    inc: number;
    azi: number;
    north: number;
    east: number;
    tvd: number;
  };
  deltas: {
    inc: number;
    azi: number;
    north: number;
    east: number;
    tvd: number;
    displacement: number;
  };
}

interface ComparisonVisualizationProps {
  comparisonPoints: ComparisonPoint[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`comparison-tabpanel-${index}`}
      aria-labelledby={`comparison-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * ComparisonVisualization Component
 *
 * Displays survey comparison data in three different visualization modes:
 * 1. 3D Wellbore Path - Shows reference and comparative surveys in 3D space
 * 2. Displacement vs MD - Shows 3D displacement along measured depth
 * 3. Delta INC & AZI vs MD - Shows inclination and azimuth differences
 */
export const ComparisonVisualization: React.FC<ComparisonVisualizationProps> = ({
  comparisonPoints,
}) => {
  const [selectedTab, setSelectedTab] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  // Extract data for reference and comparative paths
  const { referenceTrace, comparativeTrace, mdArray, displacementArray, deltaIncArray, deltaAziArray } = useMemo(() => {
    const refEast: number[] = [];
    const refNorth: number[] = [];
    const refTvd: number[] = [];

    const cmpEast: number[] = [];
    const cmpNorth: number[] = [];
    const cmpTvd: number[] = [];

    const md: number[] = [];
    const displacement: number[] = [];
    const deltaInc: number[] = [];
    const deltaAzi: number[] = [];

    comparisonPoints.forEach((point) => {
      // Reference path
      refEast.push(point.reference.east);
      refNorth.push(point.reference.north);
      refTvd.push(point.reference.tvd);

      // Comparative path
      cmpEast.push(point.comparative.east);
      cmpNorth.push(point.comparative.north);
      cmpTvd.push(point.comparative.tvd);

      // Delta data
      md.push(point.md);
      displacement.push(point.deltas.displacement);
      deltaInc.push(point.deltas.inc);
      deltaAzi.push(point.deltas.azi);
    });

    const referenceTrace = {
      x: refEast,
      y: refNorth,
      z: refTvd,
      mode: 'lines' as const,
      name: 'Reference Survey',
      line: { color: 'blue', width: 3 },
      type: 'scatter3d' as const,
    };

    const comparativeTrace = {
      x: cmpEast,
      y: cmpNorth,
      z: cmpTvd,
      mode: 'lines' as const,
      name: 'Comparative Survey',
      line: { color: 'red', width: 3 },
      type: 'scatter3d' as const,
    };

    return {
      referenceTrace,
      comparativeTrace,
      mdArray: md,
      displacementArray: displacement,
      deltaIncArray: deltaInc,
      deltaAziArray: deltaAzi,
    };
  }, [comparisonPoints]);

  // 3D Wellbore Path Layout
  const layout3D = {
    scene: {
      xaxis: { title: 'East [m]' },
      yaxis: { title: 'North [m]' },
      zaxis: {
        title: 'TVD [m]',
        autorange: 'reversed' as const,
      },
      aspectmode: 'cube' as const, // Fixes axes scale during rotation
    },
    height: 700,
    margin: { l: 0, r: 0, b: 0, t: 40 },
    legend: {
      x: 0,
      y: 1,
      xanchor: 'left' as const,
      yanchor: 'top' as const,
    },
    hovermode: 'closest' as const,
  };

  // Displacement vs MD Layout
  const layoutDisplacement = {
    title: '3D Displacement vs MD',
    xaxis: { title: 'MD [m]' },
    yaxis: { title: 'Displacement [m]' },
    height: 500,
    margin: { l: 60, r: 40, b: 60, t: 60 },
    hovermode: 'x unified' as const,
  };

  // Delta INC & AZI vs MD Layout
  const layoutDeltas = {
    title: 'Delta INC & Delta AZI vs MD',
    xaxis: { title: 'MD [m]' },
    yaxis: { title: 'Degrees' },
    height: 500,
    margin: { l: 60, r: 40, b: 60, t: 60 },
    hovermode: 'x unified' as const,
    legend: {
      x: 0,
      y: 1,
      xanchor: 'left' as const,
      yanchor: 'top' as const,
    },
  };

  return (
    <Paper elevation={3} sx={{ mt: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={selectedTab} onChange={handleTabChange} aria-label="comparison visualization tabs">
          <Tab label="3D Wellbore Path" id="comparison-tab-0" aria-controls="comparison-tabpanel-0" />
          <Tab label="Displacement vs MD" id="comparison-tab-1" aria-controls="comparison-tabpanel-1" />
          <Tab label="Delta INC & AZI vs MD" id="comparison-tab-2" aria-controls="comparison-tabpanel-2" />
        </Tabs>
      </Box>

      {/* Tab 1: 3D Wellbore Path */}
      <TabPanel value={selectedTab} index={0}>
        <Typography variant="h6" gutterBottom>
          3D Wellbore Path Comparison
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Blue line represents the reference survey, red line represents the comparative survey.
          Rotate the plot by dragging, zoom with scroll wheel.
        </Typography>
        <Plot
          data={[referenceTrace, comparativeTrace]}
          layout={layout3D}
          config={{
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['toImage'],
          }}
          style={{ width: '100%', height: '700px' }}
        />
      </TabPanel>

      {/* Tab 2: Displacement vs MD */}
      <TabPanel value={selectedTab} index={1}>
        <Typography variant="h6" gutterBottom>
          3D Displacement vs Measured Depth
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Shows the total 3D displacement between reference and comparative surveys along measured depth.
        </Typography>
        <Plot
          data={[
            {
              x: mdArray,
              y: displacementArray,
              mode: 'lines+markers',
              name: 'Displacement',
              line: { color: 'green', width: 2 },
              marker: { size: 4 },
              type: 'scatter',
            },
          ]}
          layout={layoutDisplacement}
          config={{
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
          }}
          style={{ width: '100%', height: '500px' }}
        />
      </TabPanel>

      {/* Tab 3: Delta INC & AZI */}
      <TabPanel value={selectedTab} index={2}>
        <Typography variant="h6" gutterBottom>
          Delta Inclination & Azimuth vs Measured Depth
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Shows the differences in inclination and azimuth between reference and comparative surveys.
        </Typography>
        <Plot
          data={[
            {
              x: mdArray,
              y: deltaIncArray,
              mode: 'lines',
              name: 'Delta INC',
              line: { color: 'purple', width: 2 },
              type: 'scatter',
            },
            {
              x: mdArray,
              y: deltaAziArray,
              mode: 'lines',
              name: 'Delta AZI',
              line: { color: 'orange', width: 2 },
              type: 'scatter',
            },
          ]}
          layout={layoutDeltas}
          config={{
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
          }}
          style={{ width: '100%', height: '500px' }}
        />
      </TabPanel>
    </Paper>
  );
};
