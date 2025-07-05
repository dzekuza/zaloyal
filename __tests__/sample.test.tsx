import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

function Dummy() {
  return <div>Hello</div>;
}

describe('Dummy component', () => {
  it('renders text', () => {
    render(<Dummy />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});