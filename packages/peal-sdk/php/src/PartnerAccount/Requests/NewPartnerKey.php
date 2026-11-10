<?php

namespace Peal\PartnerAccount\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Types\Permission;
use Peal\Core\Types\ArrayType;
use Peal\Types\PartnerScope;

class NewPartnerKey extends JsonSerializableType
{
    /**
     * @var ?int $expiresInDays
     */
    #[JsonProperty('expiresInDays')]
    public ?int $expiresInDays;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var array<value-of<Permission>> $permissions
     */
    #[JsonProperty('permissions'), ArrayType(['string'])]
    public array $permissions;

    /**
     * @var array<value-of<PartnerScope>> $scopes
     */
    #[JsonProperty('scopes'), ArrayType(['string'])]
    public array $scopes;

    /**
     * @param array{
     *   name: string,
     *   permissions: array<value-of<Permission>>,
     *   scopes: array<value-of<PartnerScope>>,
     *   expiresInDays?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->expiresInDays = $values['expiresInDays'] ?? null;
        $this->name = $values['name'];
        $this->permissions = $values['permissions'];
        $this->scopes = $values['scopes'];
    }
}
