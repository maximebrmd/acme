<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ForbiddenEncoded extends JsonSerializableType
{
    /**
     * @var value-of<ForbiddenEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var ?string $code
     */
    #[JsonProperty('code')]
    public ?string $code;

    /**
     * @var ?string $message
     */
    #[JsonProperty('message')]
    public ?string $message;

    /**
     * @var ?string $requestId
     */
    #[JsonProperty('requestId')]
    public ?string $requestId;

    /**
     * @var ?value-of<Permission> $permission
     */
    #[JsonProperty('permission')]
    public ?string $permission;

    /**
     * @var ?value-of<ForbiddenReason> $reason
     */
    #[JsonProperty('reason')]
    public ?string $reason;

    /**
     * @var ?string $scope
     */
    #[JsonProperty('scope')]
    public ?string $scope;

    /**
     * @param array{
     *   tag: value-of<ForbiddenEncodedTag>,
     *   code?: ?string,
     *   message?: ?string,
     *   requestId?: ?string,
     *   permission?: ?value-of<Permission>,
     *   reason?: ?value-of<ForbiddenReason>,
     *   scope?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->code = $values['code'] ?? null;
        $this->message = $values['message'] ?? null;
        $this->requestId = $values['requestId'] ?? null;
        $this->permission = $values['permission'] ?? null;
        $this->reason = $values['reason'] ?? null;
        $this->scope = $values['scope'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
