'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface FileTypeChartProps {
  data: { type: string; count: number }[]
}

export default function FileTypeChart({ data }: FileTypeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = 500
    const height = 300
    const margin = { top: 20, right: 20, bottom: 60, left: 60 }

    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.type))
      .range([0, chartWidth])
      .padding(0.2)

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 0])
      .range([chartHeight, 0])

    // Bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.type) || 0)
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => chartHeight - y(d.count))
      .attr('fill', '#1A8A82')
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseenter', function() {
        d3.select(this).attr('fill', '#0F5C57')
      })
      .on('mouseleave', function() {
        d3.select(this).attr('fill', '#1A8A82')
      })

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('font-size', '12px')
      .style('fill', '#4A5568')

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .style('font-size', '12px')
      .style('fill', '#4A5568')

    // Y Axis Label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (chartHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#4A5568')
      .text('Number of Files')

    // Values on bars
    g.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => (x(d.type) || 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.count) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#1A1D21')
      .text(d => d.count.toLocaleString())

  }, [data])

  return (
    <div className="glass-luxury rounded-lg p-6 shadow-luxury">
      <h3 className="text-lg font-display font-bold mb-4 text-text-primary">
        File Type Distribution
      </h3>
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
