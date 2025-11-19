import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, Column } from '../DataTable';

interface TestData {
  id: string;
  name: string;
  email: string;
}

const mockData: TestData[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
];

const columns: Column<TestData>[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
];

describe('DataTable', () => {
  it('renders table headers', () => {
    render(<DataTable data={mockData} columns={columns} />);

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders table data', () => {
    render(<DataTable data={mockData} columns={columns} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('renders custom cell content with render function', () => {
    const customColumns: Column<TestData>[] = [
      {
        key: 'name',
        label: 'Name',
        render: (item) => <strong>{item.name.toUpperCase()}</strong>,
      },
    ];

    render(<DataTable data={mockData} columns={customColumns} />);

    expect(screen.getByText('JOHN DOE')).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        emptyMessage="No users found"
      />
    );

    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading', () => {
    const { container } = render(
      <DataTable data={[]} columns={columns} isLoading={true} />
    );

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders pagination controls', () => {
    const onPageChange = jest.fn();

    render(
      <DataTable
        data={mockData}
        columns={columns}
        pagination={{
          currentPage: 2,
          totalPages: 5,
          onPageChange,
        }}
      />
    );

    expect(screen.getByText('Página 2 de 5')).toBeInTheDocument();
    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Siguiente')).toBeInTheDocument();
  });

  it('handles pagination button clicks', () => {
    const onPageChange = jest.fn();

    render(
      <DataTable
        data={mockData}
        columns={columns}
        pagination={{
          currentPage: 2,
          totalPages: 5,
          onPageChange,
        }}
      />
    );

    fireEvent.click(screen.getByText('Siguiente'));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByText('Anterior'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('disables previous button on first page', () => {
    render(
      <DataTable
        data={mockData}
        columns={columns}
        pagination={{
          currentPage: 1,
          totalPages: 5,
          onPageChange: jest.fn(),
        }}
      />
    );

    const prevButton = screen.getByText('Anterior').closest('button');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <DataTable
        data={mockData}
        columns={columns}
        pagination={{
          currentPage: 5,
          totalPages: 5,
          onPageChange: jest.fn(),
        }}
      />
    );

    const nextButton = screen.getByText('Siguiente').closest('button');
    expect(nextButton).toBeDisabled();
  });

  it('calls onRowClick when row is clicked', () => {
    const onRowClick = jest.fn();

    render(
      <DataTable
        data={mockData}
        columns={columns}
        onRowClick={onRowClick}
      />
    );

    const firstRow = screen.getByText('John Doe').closest('tr');
    if (firstRow) {
      fireEvent.click(firstRow);
      expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
    }
  });
});
