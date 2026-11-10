<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ActivityEvent extends JsonSerializableType
{
    /**
     * @var ActivityActor $actor
     */
    #[JsonProperty('actor')]
    public ActivityActor $actor;

    /**
     * @var ?ActivityApplication $application
     */
    #[JsonProperty('application')]
    public ?ActivityApplication $application;

    /**
     * @var ?string $errorCode
     */
    #[JsonProperty('errorCode')]
    public ?string $errorCode;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var bool $impersonated
     */
    #[JsonProperty('impersonated')]
    public bool $impersonated;

    /**
     * @var array<string, string> $objectIds
     */
    #[JsonProperty('objectIds'), ArrayType(['string' => 'string'])]
    public array $objectIds;

    /**
     * @var string $occurredAt
     */
    #[JsonProperty('occurredAt')]
    public string $occurredAt;

    /**
     * @var string $operation
     */
    #[JsonProperty('operation')]
    public string $operation;

    /**
     * @var ?string $requestId
     */
    #[JsonProperty('requestId')]
    public ?string $requestId;

    /**
     * @var ?int $status
     */
    #[JsonProperty('status')]
    public ?int $status;

    /**
     * @var value-of<ActivityVia> $via
     */
    #[JsonProperty('via')]
    public string $via;

    /**
     * @param array{
     *   actor: ActivityActor,
     *   id: string,
     *   impersonated: bool,
     *   objectIds: array<string, string>,
     *   occurredAt: string,
     *   operation: string,
     *   via: value-of<ActivityVia>,
     *   application?: ?ActivityApplication,
     *   errorCode?: ?string,
     *   requestId?: ?string,
     *   status?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->actor = $values['actor'];
        $this->application = $values['application'] ?? null;
        $this->errorCode = $values['errorCode'] ?? null;
        $this->id = $values['id'];
        $this->impersonated = $values['impersonated'];
        $this->objectIds = $values['objectIds'];
        $this->occurredAt = $values['occurredAt'];
        $this->operation = $values['operation'];
        $this->requestId = $values['requestId'] ?? null;
        $this->status = $values['status'] ?? null;
        $this->via = $values['via'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
