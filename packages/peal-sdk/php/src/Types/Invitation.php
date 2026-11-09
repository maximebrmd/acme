<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class Invitation extends JsonSerializableType
{
    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var string $email
     */
    #[JsonProperty('email')]
    public string $email;

    /**
     * @var string $expiresAt
     */
    #[JsonProperty('expiresAt')]
    public string $expiresAt;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $inviterId
     */
    #[JsonProperty('inviterId')]
    public string $inviterId;

    /**
     * @var string $role
     */
    #[JsonProperty('role')]
    public string $role;

    /**
     * @param array{
     *   createdAt: string,
     *   email: string,
     *   expiresAt: string,
     *   id: string,
     *   inviterId: string,
     *   role: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->createdAt = $values['createdAt'];
        $this->email = $values['email'];
        $this->expiresAt = $values['expiresAt'];
        $this->id = $values['id'];
        $this->inviterId = $values['inviterId'];
        $this->role = $values['role'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
