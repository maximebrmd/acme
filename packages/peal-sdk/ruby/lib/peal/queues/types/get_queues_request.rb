# frozen_string_literal: true

module Peal
  module Queues
    module Types
      class GetQueuesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :queue_id, -> { String }, optional: false, nullable: false, api_name: "queueId"
      end
    end
  end
end
