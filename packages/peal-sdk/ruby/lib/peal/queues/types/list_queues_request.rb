# frozen_string_literal: true

module Peal
  module Queues
    module Types
      class ListQueuesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
      end
    end
  end
end
