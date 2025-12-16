'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    Ban,
    Users,
    Globe,
    AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tokenManager } from '@/lib/utils/tokenManager';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PaymentValidatorProfile {
    id: string;
    status: string;
    assignedCountry: string | null;
    applicationNote: string | null;
    rejectionReason: string | null;
    approvedBy: string | null;
    approvedAt: string | null;
}

interface Validator {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    paymentValidatorProfile: PaymentValidatorProfile | null;
}

interface Counts {
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
    withoutProfile: number;
    total: number;
}

const COUNTRIES = [
    { code: 'PE', name: 'Perú' },
    { code: 'MX', name: 'México' },
    { code: 'CO', name: 'Colombia' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'BR', name: 'Brasil' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'PY', name: 'Paraguay' },
];

const STATUS_CONFIG = {
    pending: { label: 'Pendiente', color: 'bg-yellow-500', icon: Clock },
    approved: { label: 'Aprobado', color: 'bg-green-500', icon: CheckCircle },
    rejected: { label: 'Rechazado', color: 'bg-red-500', icon: XCircle },
    suspended: { label: 'Suspendido', color: 'bg-gray-500', icon: Ban },
};

export default function PaymentValidatorsPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [rejectionReason, setRejectionReason] = useState('');

    // Fetch validators
    const { data, isLoading } = useQuery({
        queryKey: ['admin-payment-validators', statusFilter],
        queryFn: async () => {
            const token = tokenManager.getToken();
            const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
            const res = await fetch(`/api/admin/payment-validators${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
    });

    const validators: Validator[] = data?.data || [];
    const counts: Counts = data?.counts || { pending: 0, approved: 0, rejected: 0, suspended: 0, withoutProfile: 0, total: 0 };

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: async ({ id, country }: { id: string; country: string }) => {
            const token = tokenManager.getToken();
            const res = await fetch(`/api/admin/payment-validators/${id}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ assignedCountry: country }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-payment-validators'] });
            toast({ title: 'Validador aprobado', description: 'El validador ha sido aprobado exitosamente.' });
            setApproveDialogOpen(false);
            setSelectedValidator(null);
            setSelectedCountry('');
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            const token = tokenManager.getToken();
            const res = await fetch(`/api/admin/payment-validators/${id}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ reason }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-payment-validators'] });
            toast({ title: 'Validador rechazado', description: 'El validador ha sido rechazado.' });
            setRejectDialogOpen(false);
            setSelectedValidator(null);
            setRejectionReason('');
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Suspend mutation
    const suspendMutation = useMutation({
        mutationFn: async (id: string) => {
            const token = tokenManager.getToken();
            const res = await fetch(`/api/admin/payment-validators/${id}/suspend`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-payment-validators'] });
            toast({ title: data.message });
        },
    });

    const openApproveDialog = (validator: Validator) => {
        setSelectedValidator(validator);
        setSelectedCountry('');
        setApproveDialogOpen(true);
    };

    const openRejectDialog = (validator: Validator) => {
        setSelectedValidator(validator);
        setRejectionReason('');
        setRejectDialogOpen(true);
    };

    const handleApprove = () => {
        if (!selectedValidator || !selectedCountry) return;
        approveMutation.mutate({ id: selectedValidator.id, country: selectedCountry });
    };

    const handleReject = () => {
        if (!selectedValidator || !rejectionReason) return;
        rejectMutation.mutate({ id: selectedValidator.id, reason: rejectionReason });
    };

    const getStatus = (validator: Validator) => {
        return validator.paymentValidatorProfile?.status || 'pending';
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Validadores de Pago</h1>
                <p className="text-muted-foreground mt-2">
                    Gestiona los validadores de pago y asigna países
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="cursor-pointer" onClick={() => setStatusFilter('all')}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Total
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{counts.total}</p>
                    </CardContent>
                </Card>

                <Card
                    className={cn("cursor-pointer", statusFilter === 'pending' && 'ring-2 ring-yellow-500')}
                    onClick={() => setStatusFilter('pending')}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-yellow-500" />
                            Pendientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-yellow-500">{counts.pending + counts.withoutProfile}</p>
                    </CardContent>
                </Card>

                <Card
                    className={cn("cursor-pointer", statusFilter === 'approved' && 'ring-2 ring-green-500')}
                    onClick={() => setStatusFilter('approved')}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Aprobados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-500">{counts.approved}</p>
                    </CardContent>
                </Card>

                <Card
                    className={cn("cursor-pointer", statusFilter === 'suspended' && 'ring-2 ring-gray-500')}
                    onClick={() => setStatusFilter('suspended')}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Ban className="h-5 w-5 text-gray-500" />
                            Suspendidos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-gray-500">{counts.suspended}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Lista de Validadores</CardTitle>
                        {statusFilter !== 'all' && (
                            <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
                                Limpiar filtro
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {validators.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No hay validadores {statusFilter !== 'all' ? 'con este estado' : ''}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>País Asignado</TableHead>
                                    <TableHead>Fecha Registro</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {validators.map((validator) => {
                                    const status = getStatus(validator);
                                    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                                    const Icon = config?.icon || Clock;

                                    return (
                                        <TableRow key={validator.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{validator.name || 'Sin nombre'}</p>
                                                    <p className="text-sm text-muted-foreground">{validator.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn("gap-1", config?.color || 'bg-yellow-500')}>
                                                    <Icon className="h-3 w-3" />
                                                    {config?.label || 'Pendiente'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {validator.paymentValidatorProfile?.assignedCountry ? (
                                                    <Badge variant="outline" className="gap-1">
                                                        <Globe className="h-3 w-3" />
                                                        {COUNTRIES.find(c => c.code === validator.paymentValidatorProfile?.assignedCountry)?.name || validator.paymentValidatorProfile.assignedCountry}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Sin asignar</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(validator.createdAt), 'dd/MM/yyyy')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-2 justify-end">
                                                    {(status === 'pending' || !validator.paymentValidatorProfile) && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                onClick={() => openApproveDialog(validator)}
                                                            >
                                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                                Aprobar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => openRejectDialog(validator)}
                                                            >
                                                                <XCircle className="h-4 w-4 mr-1" />
                                                                Rechazar
                                                            </Button>
                                                        </>
                                                    )}
                                                    {status === 'approved' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => suspendMutation.mutate(validator.id)}
                                                            disabled={suspendMutation.isPending}
                                                        >
                                                            <Ban className="h-4 w-4 mr-1" />
                                                            Suspender
                                                        </Button>
                                                    )}
                                                    {status === 'suspended' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => suspendMutation.mutate(validator.id)}
                                                            disabled={suspendMutation.isPending}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                            Reactivar
                                                        </Button>
                                                    )}
                                                    {status === 'rejected' && (
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => openApproveDialog(validator)}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                            Aprobar
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Approve Dialog */}
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Aprobar Validador</DialogTitle>
                        <DialogDescription>
                            Asigna un país a {selectedValidator?.name || selectedValidator?.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>País a Asignar *</Label>
                        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Selecciona un país" />
                            </SelectTrigger>
                            <SelectContent>
                                {COUNTRIES.map((country) => (
                                    <SelectItem key={country.code} value={country.code}>
                                        {country.name} ({country.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">
                            Este validador solo podrá gestionar pagos de usuarios de este país.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={!selectedCountry || approveMutation.isPending}
                        >
                            {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Aprobar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rechazar Validador</DialogTitle>
                        <DialogDescription>
                            Indica el motivo del rechazo para {selectedValidator?.name || selectedValidator?.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Motivo del Rechazo *</Label>
                        <Textarea
                            className="mt-2"
                            placeholder="Escribe el motivo..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={!rejectionReason || rejectMutation.isPending}
                        >
                            {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Rechazar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
