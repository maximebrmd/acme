# frozen_string_literal: true

module Peal
  module Queues
    module Types
      class CreateQueuesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :body, -> { Peal::Types::QueueDetails }, optional: false, nullable: false
      end
    end
  end
end
