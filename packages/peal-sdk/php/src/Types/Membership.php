<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class Membership extends JsonSerializableType
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
     * @var string $role
     */
    #[JsonProperty('role')]
    public string $role;

    /**
     * @var string $slug
     */
    #[JsonProperty('slug')]
    public string $slug;

    /**
     * @var bool $twoStepRequired
     */
    #[JsonProperty('twoStepRequired')]
    public bool $twoStepRequired;

    /**
     * @param array{
     *   id: string,
     *   name: string,
     *   permissions: array<value-of<Permission>>,
     *   role: string,
     *   slug: string,
     *   twoStepRequired: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->name = $values['name'];
        $this->permissions = $values['permissions'];
        $this->role = $values['role'];
        $this->slug = $values['slug'];
        $this->twoStepRequired = $values['twoStepRequired'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
