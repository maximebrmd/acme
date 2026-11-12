<?php

namespace Peal\Overview\Requests;

use Peal\Core\Json\JsonSerializableType;

class AgendaOverviewRequest extends JsonSerializableType
{
    /**
     * @var ?string $cursor
     */
    public ?string $cursor;

    /**
     * @var string $from
     */
    public string $from;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @var string $to
     */
    public string $to;

    /**
     * @var ?string $workspaceIds
     */
    public ?string $workspaceIds;

    /**
     * @param array{
     *   from: string,
     *   to: string,
     *   cursor?: ?string,
     *   limit?: ?string,
     *   workspaceIds?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->cursor = $values['cursor'] ?? null;
        $this->from = $values['from'];
        $this->limit = $values['limit'] ?? null;
        $this->to = $values['to'];
        $this->workspaceIds = $values['workspaceIds'] ?? null;
    }
}
