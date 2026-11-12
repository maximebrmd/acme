# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WorkspaceOverview < Internal::Types::Model
      field :channels, -> { Peal::Types::OverviewChannels }, optional: false, nullable: true

      field :id, -> { String }, optional: false, nullable: false

      field :inbox, -> { Peal::Types::OverviewInbox }, optional: false, nullable: true

      field :name, -> { String }, optional: false, nullable: false

      field :over_plan, -> { Internal::Types::Boolean }, optional: false, nullable: true, api_name: "overPlan"

      field :posts, -> { Peal::Types::OverviewPosts }, optional: false, nullable: true

      field :refused, -> { Peal::Types::OverviewRefusal }, optional: false, nullable: true

      field :role, -> { String }, optional: false, nullable: false

      field :slug, -> { String }, optional: false, nullable: false
    end
  end
end
