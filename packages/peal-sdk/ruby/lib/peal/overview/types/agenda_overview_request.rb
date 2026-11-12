# frozen_string_literal: true

module Peal
  module Overview
    module Types
      class AgendaOverviewRequest < Internal::Types::Model
        field :cursor, -> { String }, optional: true, nullable: false

        field :from, -> { String }, optional: false, nullable: false

        field :limit, -> { String }, optional: true, nullable: false

        field :to, -> { String }, optional: false, nullable: false

        field :workspace_ids, -> { String }, optional: true, nullable: false, api_name: "workspaceIds"
      end
    end
  end
end
