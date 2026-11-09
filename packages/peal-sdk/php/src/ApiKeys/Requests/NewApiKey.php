<?php

namespace Peal\ApiKeys\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Types\Permission;
use Peal\Core\Types\ArrayType;

class NewApiKey extends JsonSerializableType
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
     * @param array{
     *   name: string,
     *   permissions: array<value-of<Permission>>,
     *   expiresInDays?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->expiresInDays = $values['expiresInDays'] ?? null;
        $this->name = $values['name'];
        $this->permissions = $values['permissions'];
    }
}
