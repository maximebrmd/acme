# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on a Pinterest account, as a Pin. Scheduling needs `boardId`.
    class PinterestOptions < Internal::Types::Model
      field :board_id, -> { String }, optional: true, nullable: false, api_name: "boardId"

      field :board_section_id, -> { String }, optional: true, nullable: false, api_name: "boardSectionId"

      field :cover_second, -> { Integer }, optional: true, nullable: false, api_name: "coverSecond"

      field :dominant_color, -> { String }, optional: true, nullable: false, api_name: "dominantColor"

      field :link, -> { String }, optional: true, nullable: false

      field :title, -> { String }, optional: true, nullable: false
    end
  end
end
