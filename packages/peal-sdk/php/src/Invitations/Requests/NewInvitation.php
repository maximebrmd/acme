<?php

namespace Peal\Invitations\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Types\Role;

class NewInvitation extends JsonSerializableType
{
    /**
     * @var string $email
     */
    #[JsonProperty('email')]
    public string $email;

    /**
     * @var value-of<Role> $role
     */
    #[JsonProperty('role')]
    public string $role;

    /**
     * @param array{
     *   email: string,
     *   role: value-of<Role>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->email = $values['email'];
        $this->role = $values['role'];
    }
}
