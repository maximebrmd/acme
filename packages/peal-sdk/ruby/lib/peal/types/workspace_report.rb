# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WorkspaceReport < Internal::Types::Model
      field :analytics, -> { Peal::Types::WorkspaceAnalytics }, optional: false, nullable: true

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :refused, -> { Peal::Types::OverviewRefusal }, optional: false, nullable: true

      field :role, -> { String }, optional: false, nullable: false

      field :slug, -> { String }, optional: false, nullable: false
    end
  end
end
