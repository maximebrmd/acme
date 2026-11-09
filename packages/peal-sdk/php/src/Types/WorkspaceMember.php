<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class WorkspaceMember extends JsonSerializableType
{
    /**
     * @var string $email
     */
    #[JsonProperty('email')]
    public string $email;

    /**
     * @var string $joinedAt
     */
    #[JsonProperty('joinedAt')]
    public string $joinedAt;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var string $role
     */
    #[JsonProperty('role')]
    public string $role;

    /**
     * @var string $userId
     */
    #[JsonProperty('userId')]
    public string $userId;

    /**
     * @param array{
     *   email: string,
     *   joinedAt: string,
     *   name: string,
     *   role: string,
     *   userId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->email = $values['email'];
        $this->joinedAt = $values['joinedAt'];
        $this->name = $values['name'];
        $this->role = $values['role'];
        $this->userId = $values['userId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
