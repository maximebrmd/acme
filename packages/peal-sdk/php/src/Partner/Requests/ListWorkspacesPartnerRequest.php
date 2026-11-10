<?php

namespace Peal\Partner\Requests;

use Peal\Core\Json\JsonSerializableType;

class ListWorkspacesPartnerRequest extends JsonSerializableType
{
    /**
     * @var ?string $before
     */
    public ?string $before;

    /**
     * @var ?string $externalId
     */
    public ?string $externalId;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @var ?string $name
     */
    public ?string $name;

    /**
     * @param array{
     *   before?: ?string,
     *   externalId?: ?string,
     *   limit?: ?string,
     *   name?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->before = $values['before'] ?? null;
        $this->externalId = $values['externalId'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->name = $values['name'] ?? null;
    }
}
