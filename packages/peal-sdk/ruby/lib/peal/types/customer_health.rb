# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CustomerHealth < Internal::Types::Model
      field :channels, -> { Peal::Types::OverviewChannels }, optional: false, nullable: true

      field :external_id, -> { String }, optional: false, nullable: true, api_name: "externalId"

      field :id, -> { String }, optional: false, nullable: false

      field :inbox, -> { Peal::Types::OverviewInbox }, optional: false, nullable: true

      field :name, -> { String }, optional: false, nullable: false

      field :posts, -> { Peal::Types::OverviewPosts }, optional: false, nullable: true
    end
  end
end
