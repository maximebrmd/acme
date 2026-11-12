<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class CredentialPartnerKey extends JsonSerializableType
{
    /**
     * @var ?string $expiresAt
     */
    #[JsonProperty('expiresAt')]
    public ?string $expiresAt;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var CredentialPartner $partner
     */
    #[JsonProperty('partner')]
    public CredentialPartner $partner;

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
     * @var string $start
     */
    #[JsonProperty('start')]
    public string $start;

    /**
     * @param array{
     *   id: string,
     *   name: string,
     *   partner: CredentialPartner,
     *   permissions: array<value-of<Permission>>,
     *   scopes: array<value-of<PartnerScope>>,
     *   start: string,
     *   expiresAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->expiresAt = $values['expiresAt'] ?? null;
        $this->id = $values['id'];
        $this->name = $values['name'];
        $this->partner = $values['partner'];
        $this->permissions = $values['permissions'];
        $this->scopes = $values['scopes'];
        $this->start = $values['start'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
