<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class CredentialBindingBound extends JsonSerializableType
{
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
     * @var array<value-of<Permission>> $permissions
     */
    #[JsonProperty('permissions'), ArrayType(['string'])]
    public array $permissions;

    /**
     * @var ?value-of<OverviewRefusal> $refused
     */
    #[JsonProperty('refused')]
    public ?string $refused;

    /**
     * @param array{
     *   id: string,
     *   name: string,
     *   permissions: array<value-of<Permission>>,
     *   refused?: ?value-of<OverviewRefusal>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->name = $values['name'];
        $this->permissions = $values['permissions'];
        $this->refused = $values['refused'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
