import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { CategoryBadge } from '../CategoryBadge';

describe('CategoryBadge', () => {
  it('renders Netflix category with correct label and styling', () => {
    const { container } = render(<CategoryBadge category="netflix" />);

    expect(screen.getByText('Netflix')).toBeInTheDocument();

    const badge = container.querySelector('.bg-red-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('renders Spotify category with correct label and styling', () => {
    const { container } = render(<CategoryBadge category="spotify" />);

    expect(screen.getByText('Spotify')).toBeInTheDocument();

    const badge = container.querySelector('.bg-green-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('renders HBO category with correct label and styling', () => {
    const { container } = render(<CategoryBadge category="hbo" />);

    expect(screen.getByText('HBO')).toBeInTheDocument();

    const badge = container.querySelector('.bg-purple-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('renders Disney+ category with correct label and styling', () => {
    const { container } = render(<CategoryBadge category="disney" />);

    expect(screen.getByText('Disney+')).toBeInTheDocument();

    const badge = container.querySelector('.bg-blue-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('renders Prime Video category with correct label and styling', () => {
    const { container } = render(<CategoryBadge category="prime" />);

    expect(screen.getByText('Prime Video')).toBeInTheDocument();

    const badge = container.querySelector('.bg-cyan-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('renders YouTube category with correct label and styling', () => {
    const { container } = render(<CategoryBadge category="youtube" />);

    expect(screen.getByText('YouTube')).toBeInTheDocument();

    const badge = container.querySelector('.bg-red-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('renders Other category with correct label and styling', () => {
    const { container } = render(<CategoryBadge category="other" />);

    expect(screen.getByText('Other')).toBeInTheDocument();

    const badge = container.querySelector('.bg-gray-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('renders without icon when showIcon is false', () => {
    const { container } = render(
      <CategoryBadge category="netflix" showIcon={false} />
    );

    expect(screen.getByText('Netflix')).toBeInTheDocument();

    // Check that no SVG icon is present
    const svgIcon = container.querySelector('svg');
    expect(svgIcon).not.toBeInTheDocument();
  });

  it('renders with icon by default', () => {
    const { container } = render(<CategoryBadge category="netflix" />);

    expect(screen.getByText('Netflix')).toBeInTheDocument();

    // Check that SVG icon is present
    const svgIcon = container.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CategoryBadge category="netflix" className="custom-class" />
    );

    const badge = container.querySelector('.custom-class');
    expect(badge).toBeInTheDocument();
  });
});
