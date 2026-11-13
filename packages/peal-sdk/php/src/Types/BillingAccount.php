<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class BillingAccount extends JsonSerializableType
{
    /**
     * @var string $billingWorkspaceId
     */
    #[JsonProperty('billingWorkspaceId')]
    public string $billingWorkspaceId;

    /**
     * @var ?string $billingWorkspaceName
     */
    #[JsonProperty('billingWorkspaceName')]
    public ?string $billingWorkspaceName;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var array<AccountWorkspace> $otherWorkspaces
     */
    #[JsonProperty('otherWorkspaces'), ArrayType([AccountWorkspace::class])]
    public array $otherWorkspaces;

    /**
     * @var bool $partner
     */
    #[JsonProperty('partner')]
    public bool $partner;

    /**
     * @var bool $payer
     */
    #[JsonProperty('payer')]
    public bool $payer;

    /**
     * @var ?BillingTransfer $transfer
     */
    #[JsonProperty('transfer')]
    public ?BillingTransfer $transfer;

    /**
     * @var int $workspaces
     */
    #[JsonProperty('workspaces')]
    public int $workspaces;

    /**
     * @param array{
     *   billingWorkspaceId: string,
     *   id: string,
     *   otherWorkspaces: array<AccountWorkspace>,
     *   partner: bool,
     *   payer: bool,
     *   workspaces: int,
     *   billingWorkspaceName?: ?string,
     *   transfer?: ?BillingTransfer,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->billingWorkspaceId = $values['billingWorkspaceId'];
        $this->billingWorkspaceName = $values['billingWorkspaceName'] ?? null;
        $this->id = $values['id'];
        $this->otherWorkspaces = $values['otherWorkspaces'];
        $this->partner = $values['partner'];
        $this->payer = $values['payer'];
        $this->transfer = $values['transfer'] ?? null;
        $this->workspaces = $values['workspaces'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
